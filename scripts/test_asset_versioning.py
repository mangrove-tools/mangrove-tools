import hashlib
import posixpath
import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
CACHE_SENSITIVE_ASSETS = {
    "/fonts.css",
    "/site.css",
    "/studio.css",
    "/tool-shell.css",
    "/analytics/budget/app.js",
    "/analytics/budget/styles.css",
    "/shared/budget-allocator.js",
    "/shared/budget-sample-data.js",
    "/shared/charts.js",
    "/shared/google-analytics.js",
    "/shared/history-data.js",
    "/shared/marginality-engine.js",
    "/shared/motion.js",
    "/shared/tool-extras.js",
}
FINGERPRINTED_ASSET_NAME = re.compile(
    r"^(?P<stem>.+)\.[0-9a-f]{12}(?P<suffix>\.[^.]+)$"
)
NON_PUBLIC_DIRECTORY_NAMES = {
    "docs",
    "scripts",
    "tests",
    ".git",
    ".worktrees",
    "node_modules",
}


class AssetReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attributes = dict(attrs)
        relation = set((attributes.get("rel") or "").lower().split())
        is_cache_bearing_link = "stylesheet" in relation or (
            "preload" in relation and attributes.get("as", "").lower() == "script"
        ) or "modulepreload" in relation
        if tag == "link" and attributes.get("href") and is_cache_bearing_link:
            self.references.append(attributes.get("href") or "")
        if tag == "script" and attributes.get("src"):
            self.references.append(attributes["src"] or "")


def local_reference_path(
    html_path: Path,
    reference: str,
) -> str | None:
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    if parsed.path.startswith("/"):
        return posixpath.normpath(parsed.path)
    parent = PurePosixPath("/") / html_path.parent.as_posix()
    return posixpath.normpath(str(parent / parsed.path))


def content_version(asset_path: str, root: Path = ROOT) -> str:
    return hashlib.sha256(
        (root / asset_path.lstrip("/")).read_bytes()
    ).hexdigest()[:12]


def versioned_path(asset_path: str, root: Path = ROOT) -> str:
    path = PurePosixPath(asset_path)
    return str(
        path.with_name(
            f"{path.stem}.{content_version(asset_path, root)}{path.suffix}"
        )
    )


def public_html_files(root: Path) -> list[Path]:
    return [
        path
        for path in sorted(root.rglob("*.html"))
        if not (
            set(path.relative_to(root).parts[:-1])
            & NON_PUBLIC_DIRECTORY_NAMES
        )
    ]


def canonical_asset_path(reference_path: str) -> str:
    reference = PurePosixPath(reference_path)
    match = FINGERPRINTED_ASSET_NAME.fullmatch(reference.name)
    if match is None:
        return reference_path
    return str(reference.with_name(f"{match['stem']}{match['suffix']}"))


def discover_cache_sensitive_assets(root: Path) -> set[str]:
    assets: set[str] = set()
    for html_path in public_html_files(root):
        parser = AssetReferenceParser()
        parser.feed(html_path.read_text(encoding="utf-8"))
        for reference in parser.references:
            path = local_reference_path(html_path.relative_to(root), reference)
            if path is not None:
                assets.add(canonical_asset_path(path))
    return assets


def asset_versioning_errors(
    root: Path,
    asset_paths: set[str] | None = None,
) -> list[str]:
    if asset_paths is None:
        asset_paths = discover_cache_sensitive_assets(root)
    references_by_asset: dict[str, list[tuple[Path, str, str]]] = {
        asset: [] for asset in asset_paths
    }

    for html_path in public_html_files(root):
        parser = AssetReferenceParser()
        parser.feed(html_path.read_text(encoding="utf-8"))
        for reference in parser.references:
            path = local_reference_path(
                html_path.relative_to(root),
                reference,
            )
            if path is None:
                continue
            asset_path = canonical_asset_path(path)
            if asset_path in references_by_asset:
                references_by_asset[asset_path].append(
                    (html_path.relative_to(root), reference, path)
                )

    errors: list[str] = []
    for asset_path, references in references_by_asset.items():
        if not references:
            errors.append(f"{asset_path} is not referenced")
            continue

        expected_path = versioned_path(asset_path, root)
        versioned_file = root / expected_path.lstrip("/")
        if not versioned_file.is_file():
            errors.append(f"versioned asset is missing: {expected_path}")
        elif (
            root / asset_path.lstrip("/")
        ).read_bytes() != versioned_file.read_bytes():
            errors.append(f"{expected_path} must match {asset_path}")

        for html_path, reference, reference_path in references:
            if reference_path != expected_path:
                errors.append(
                    f"{html_path} must request the fingerprinted "
                    f"asset {expected_path}"
                )
            if urlsplit(reference).query:
                errors.append(
                    f"{html_path} must not use query-string cache busting"
                )

    return errors


class AssetVersioningTests(unittest.TestCase):
    def test_discovers_every_public_local_script_and_stylesheet(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "nested").mkdir()
            excluded_html_trees = (
                root / "docs",
                root / "scripts",
                root / "tests",
                root / ".git",
                root / ".worktrees",
                root / "node_modules",
                root / "nested" / "docs",
            )
            for excluded_tree in excluded_html_trees:
                excluded_tree.mkdir()
            (root / "index.html").write_text(
                "\n".join(
                    (
                        '<link rel="stylesheet" href="/site.0123456789ab.css">',
                        '<link rel="preload" as="script" href="/app.abcdef012345.js">',
                        '<script src="/app.helper.fedcba987654.js"></script>',
                        '<link rel="canonical" href="https://mangrovetools.com/">',
                        '<link rel="stylesheet" href="https://cdn.example/site.css">',
                    )
                ),
                encoding="utf-8",
            )
            (root / "nested" / "index.html").write_text(
                '<script src="../shared/tool.111111111111.js"></script>',
                encoding="utf-8",
            )
            for excluded_tree in excluded_html_trees:
                (excluded_tree / "index.html").write_text(
                    '<script src="/excluded.222222222222.js"></script>',
                    encoding="utf-8",
                )

            self.assertEqual(
                [root / "index.html", root / "nested" / "index.html"],
                public_html_files(root),
            )
            self.assertEqual(
                "/app.js",
                canonical_asset_path("/app.abcdef012345.js"),
            )
            self.assertEqual(
                "/app.helper.js",
                canonical_asset_path("/app.helper.fedcba987654.js"),
            )
            self.assertEqual(
                {
                    "/site.css",
                    "/app.js",
                    "/app.helper.js",
                    "/shared/tool.js",
                },
                discover_cache_sensitive_assets(root),
            )

    def test_cache_sensitive_assets_use_content_fingerprints_in_public_html(self) -> None:
        errors = asset_versioning_errors(ROOT, CACHE_SENSITIVE_ASSETS)

        self.assertEqual([], errors, "\n".join(errors))

    def test_current_public_assets_use_automatic_fingerprint_contract(self) -> None:
        errors = asset_versioning_errors(ROOT)

        self.assertEqual([], errors, "\n".join(errors))

    def test_fixture_matrix_catches_cache_unsafe_references(self) -> None:
        asset_path = "/analytics/budget/app.js"
        canonical_bytes = b"window.MangroveBudget = true;\n"

        cases = (
            {
                "name": "script preload",
                "markup": (
                    '<link rel="preload" as="script" href="{versioned}">'
                ),
                "versioned_bytes": canonical_bytes,
                "expected_error": None,
            },
            {
                "name": "missing fingerprinted copy",
                "markup": '<script src="{versioned}"></script>',
                "versioned_bytes": None,
                "expected_error": "versioned asset is missing",
            },
            {
                "name": "mismatched fingerprinted copy",
                "markup": '<script src="{versioned}"></script>',
                "versioned_bytes": b"window.MangroveBudget = false;\n",
                "expected_error": "must match",
            },
            {
                "name": "query-string cache busting",
                "markup": '<script src="{versioned}?v=2"></script>',
                "versioned_bytes": canonical_bytes,
                "expected_error": "must not use query-string cache busting",
            },
            {
                "name": "unversioned public reference",
                "markup": '<script src="{canonical}"></script>',
                "versioned_bytes": canonical_bytes,
                "expected_error": "must request the fingerprinted asset",
            },
        )

        for case in cases:
            with self.subTest(case=case["name"]):
                with tempfile.TemporaryDirectory() as temp_dir:
                    root = Path(temp_dir)
                    canonical_file = root / asset_path.lstrip("/")
                    canonical_file.parent.mkdir(parents=True)
                    canonical_file.write_bytes(canonical_bytes)
                    expected_path = versioned_path(asset_path, root)
                    versioned_bytes = case["versioned_bytes"]
                    if versioned_bytes is not None:
                        versioned_file = root / expected_path.lstrip("/")
                        versioned_file.write_bytes(versioned_bytes)
                    (root / "index.html").write_text(
                        str(case["markup"]).format(
                            canonical=asset_path,
                            versioned=expected_path,
                        ),
                        encoding="utf-8",
                    )

                    errors = asset_versioning_errors(root, {asset_path})
                    expected_error = case["expected_error"]
                    if expected_error is None:
                        self.assertEqual([], errors)
                    else:
                        self.assertTrue(
                            any(expected_error in error for error in errors),
                            errors,
                        )
