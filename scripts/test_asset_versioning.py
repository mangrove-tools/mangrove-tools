import hashlib
import unittest
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
VERSIONED_ASSETS = {
    "/fonts.css",
    "/site.css",
    "/tool-shell.css",
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
        if tag == "link" and attributes.get("rel") == "stylesheet":
            self.references.append(attributes.get("href") or "")
        if tag == "script" and attributes.get("src"):
            self.references.append(attributes["src"] or "")


def content_version(asset_path: str) -> str:
    return hashlib.sha256((ROOT / asset_path.lstrip("/")).read_bytes()).hexdigest()[:12]


def versioned_path(asset_path: str) -> str:
    path = PurePosixPath(asset_path)
    return str(path.with_name(f"{path.stem}.{content_version(asset_path)}{path.suffix}"))


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


class SharedAssetVersioningTests(unittest.TestCase):
    def test_shared_assets_use_content_fingerprints_in_public_html(self) -> None:
        references_by_asset: dict[str, list[tuple[Path, str]]] = {
            asset: [] for asset in VERSIONED_ASSETS
        }

        for html_path in sorted(ROOT.rglob("*.html")):
            parser = AssetReferenceParser()
            parser.feed(html_path.read_text(encoding="utf-8"))
            for reference in parser.references:
                path = urlsplit(reference).path
                for asset_path in VERSIONED_ASSETS:
                    if belongs_to_asset_family(path, asset_path):
                        references_by_asset[asset_path].append(
                            (html_path.relative_to(ROOT), reference)
                        )
                        break

        for asset_path, references in references_by_asset.items():
            with self.subTest(asset=asset_path):
                self.assertTrue(references, f"{asset_path} is not referenced")
                expected_path = versioned_path(asset_path)
                versioned_file = ROOT / expected_path.lstrip("/")
                self.assertTrue(
                    versioned_file.is_file(),
                    f"versioned asset is missing: {expected_path}",
                )
                self.assertEqual(
                    (ROOT / asset_path.lstrip("/")).read_bytes(),
                    versioned_file.read_bytes(),
                    f"{expected_path} must match {asset_path}",
                )
                for html_path, reference in references:
                    self.assertEqual(
                        expected_path,
                        urlsplit(reference).path,
                        (
                            f"{html_path} must request the fingerprinted "
                            f"asset {expected_path}"
                        ),
                    )
                    self.assertFalse(
                        urlsplit(reference).query,
                        f"{html_path} must not use query-string cache busting",
                    )
