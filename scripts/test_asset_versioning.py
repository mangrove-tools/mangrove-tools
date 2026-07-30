import hashlib
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
CACHE_SENSITIVE_ASSETS = {
    "/fonts.css",
    "/site.css",
    "/tool-shell.css",
    "/analytics/budget/app.js",
    "/shared/charts.js",
    "/shared/motion.js",
}


class AssetReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attributes = dict(attrs)
        if tag == "link" and attributes.get("href"):
            self.references.append(attributes.get("href") or "")
        if tag == "script" and attributes.get("src"):
            self.references.append(attributes["src"] or "")


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


def belongs_to_asset_family(reference_path: str, asset_path: str) -> bool:
    reference = PurePosixPath(reference_path)
    canonical = PurePosixPath(asset_path)
    return (
        reference.parent == canonical.parent
        and reference.suffix == canonical.suffix
        and (
            reference.name == canonical.name
            or reference.name.startswith(f"{canonical.stem}.")
        )
    )


def asset_versioning_errors(
    root: Path,
    asset_paths: set[str],
) -> list[str]:
    references_by_asset: dict[str, list[tuple[Path, str]]] = {
        asset: [] for asset in asset_paths
    }

    for html_path in sorted(root.rglob("*.html")):
        parser = AssetReferenceParser()
        parser.feed(html_path.read_text(encoding="utf-8"))
        for reference in parser.references:
            path = urlsplit(reference).path
            for asset_path in asset_paths:
                if belongs_to_asset_family(path, asset_path):
                    references_by_asset[asset_path].append(
                        (html_path.relative_to(root), reference)
                    )
                    break

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

        for html_path, reference in references:
            if urlsplit(reference).path != expected_path:
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
    def test_cache_sensitive_assets_use_content_fingerprints_in_public_html(self) -> None:
        errors = asset_versioning_errors(ROOT, CACHE_SENSITIVE_ASSETS)

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
