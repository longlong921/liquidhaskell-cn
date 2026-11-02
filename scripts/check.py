#!/usr/bin/env python3
"""Check the generated tutorial, local links, and preserved upstream examples.

Run from any directory with ``python3 scripts/check.py`` after building the site.
Only the Python standard library is required; no network requests are made.
"""

from collections import Counter
from difflib import unified_diff
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "docs"
CHAPTERS = (
    "Tutorial_01_Introduction",
    "Tutorial_02_Logic",
    "Tutorial_03_Basic",
    "Tutorial_04_Polymorphism",
    "Tutorial_05_Datatypes",
    "Tutorial_06_Measure_Bool",
    "Tutorial_07_Measure_Int",
    "Tutorial_08_Measure_Set",
    "Tutorial_09_Case_Study_Lazy_Queues",
    "Tutorial_10_Case_Study_Associative_Maps",
    "Tutorial_11_Case_Study_Pointers",
    "Tutorial_12_Case_Study_AVL",
)
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
FENCED_BLOCK = re.compile(
    r"^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n"
    r"(?P<code>.*?)^[ \t]*(?P=fence)[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
LITERATE_BLOCK = re.compile(
    r"\\begin\{(?P<environment>code|spec)\}[ \t]*\n"
    r"(?P<literate>.*?)\\end\{(?P=environment)\}"
    r"|^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n"
    r"(?P<fenced>.*?)^[ \t]*(?P=fence)[ \t]*$",
    re.MULTILINE | re.DOTALL,
)


def label(path):
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def normalized_code(code):
    # Markdown renderers can add/remove surrounding newlines. All other bytes
    # (including indentation, comments, and trailing spaces) must be preserved.
    return code.strip("\r\n")


class Page(HTMLParser):
    """Collect the HTML facts used by the independent consistency checks."""

    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.language = None
        self.ids = []
        self.anchors = set()
        self.links = []
        self.blocks = []
        self.stack = []
        self.code_depth = None
        self.code_text = []
        self.feed(path.read_text(encoding="utf-8"))
        self.close()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        line = self.getpos()[0]
        if tag == "html":
            self.language = attrs.get("lang")
        if "id" in attrs:
            self.ids.append(attrs["id"])
            self.anchors.add(attrs["id"])
        if tag == "a" and attrs.get("name"):
            self.anchors.add(attrs["name"])

        for attribute in ("href", "src", "poster"):
            target = attrs.get(attribute)
            if target is None:
                continue
            runtime = attribute in {"src", "poster"} or (
                tag == "link" and bool(
                    set(attrs.get("rel", "").split())
                    & {"stylesheet", "icon", "preload", "modulepreload", "prefetch"}
                )
            )
            self.links.append((target, line, f"{tag}[{attribute}]", runtime))
        if attrs.get("srcset"):
            for candidate in attrs["srcset"].split(","):
                if candidate.strip():
                    self.links.append((candidate.strip().split()[0], line, "srcset", True))

        if tag not in VOID_ELEMENTS:
            self.stack.append((tag, set(attrs.get("class", "").split())))
        if tag == "code" and (
            any(t == "article" and "prose" in classes for t, classes in self.stack)
            and any("code-block" in classes for _, classes in self.stack)
            and any(t == "pre" for t, _ in self.stack)
        ):
            self.code_depth = len(self.stack)
            self.code_text = []

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_ELEMENTS:
            self.handle_endtag(tag)

    def handle_data(self, data):
        if self.code_depth is not None:
            self.code_text.append(data)

    def handle_endtag(self, tag):
        if tag == "code" and self.code_depth == len(self.stack):
            self.blocks.append(normalized_code("".join(self.code_text)))
            self.code_depth = None
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break


def compare_blocks(expected, actual, path, errors):
    if expected == actual:
        return
    if len(expected) != len(actual):
        errors.append(
            f"{label(path)}: expected {len(expected)} visible upstream code blocks "
            f"in order, found {len(actual)}"
        )
    for index, (original, translated) in enumerate(zip(expected, actual), 1):
        if original != translated:
            difference = list(unified_diff(
                original.splitlines(keepends=True), translated.splitlines(keepends=True),
                fromfile="upstream", tofile=label(path), n=2,
            ))
            errors.append(
                f"{label(path)}: code block {index} differs from upstream\n"
                + "".join(difference[:16]).rstrip()
            )
            break


def check_link(origin, target, context, runtime, pages, errors):
    try:
        url = urlsplit(target)
    except ValueError as error:
        errors.append(f"{label(origin)} {context}: malformed URL {target!r}: {error}")
        return
    if url.scheme or url.netloc:
        if runtime and (url.scheme in {"http", "https"} or url.netloc):
            errors.append(f"{label(origin)} {context}: remote runtime asset {target!r}")
        elif url.scheme == "file":
            errors.append(f"{label(origin)} {context}: nonportable file URL {target!r}")
        return

    path = unquote(url.path)
    destination = ((SITE / path.lstrip("/")) if path.startswith("/")
                   else (origin.parent / path if path else origin)).resolve()
    if not destination.is_relative_to(SITE):
        errors.append(f"{label(origin)} {context}: link escapes docs/: {target!r}")
        return
    if destination.is_dir():
        destination /= "index.html"
    if not destination.is_file():
        errors.append(
            f"{label(origin)} {context}: missing target {target!r} -> {label(destination)}"
        )
        return
    if url.fragment and destination.suffix.lower() in {".html", ".htm"}:
        fragment = unquote(url.fragment)
        page = pages.get(destination)
        if page is None or fragment not in page.anchors:
            errors.append(
                f"{label(origin)} {context}: missing anchor {fragment!r} "
                f"in {label(destination)} (link {target!r})"
            )


def main():
    errors = []
    manifest_path = ROOT / "upstream-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in manifest["files"]:
        path = ROOT / entry["path"]
        if not path.is_file():
            errors.append(f"{entry['path']}: pinned upstream file is missing")
            continue
        data = path.read_bytes()
        digest = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if digest != entry["git_blob_sha1"]:
            errors.append(f"{entry['path']}: content differs from pinned upstream Git blob")
    pages = {}
    for path in sorted(SITE.rglob("*.html")):
        try:
            page = Page(path)
        except (OSError, UnicodeError) as error:
            errors.append(f"{label(path)}: cannot read HTML: {error}")
            continue
        pages[path.resolve()] = page
        if page.language != "zh-CN":
            errors.append(f"{label(path)}: expected html lang='zh-CN', got {page.language!r}")
        for anchor, count in Counter(page.ids).items():
            if count > 1:
                errors.append(f"{label(path)}: duplicate id={anchor!r} ({count} occurrences)")

    required = [f"{slug}.html" for slug in CHAPTERS]
    required += ["index.html", "guide.html", "glossary.html", "about.html", "404.html",
                 "LICENSE", "assets/style.css", "assets/app.js", "assets/favicon.svg"]
    for name in required:
        if not (SITE / name).is_file():
            errors.append(f"docs/{name}: required generated file is missing; run npm run build")

    link_count = 0
    for path, page in pages.items():
        for target, line, attribute, runtime in page.links:
            check_link(path, target, f"line {line} {attribute}", runtime, pages, errors)
            link_count += 1

    for path in sorted(SITE.rglob("*.css")):
        css = path.read_text(encoding="utf-8")
        targets = re.findall(r"url\(\s*(['\"]?)(.*?)\1\s*\)", css, re.DOTALL)
        targets += re.findall(r"@import\s+(['\"])(.*?)\1", css)
        for _, target in targets:
            check_link(path, target, "CSS resource", True, pages, errors)

    block_count = 0
    for slug in CHAPTERS:
        source = ROOT / "examples" / f"{slug}.lhs"
        translated = ROOT / "content" / f"{slug}.md"
        if not source.is_file() or not translated.is_file():
            errors.append(f"{slug}: missing original .lhs or translated .md source")
            continue
        original_text = source.read_text(encoding="utf-8")
        visible = re.sub(
            r"\\begin\{comment\}.*?\\end\{comment\}", "", original_text, flags=re.DOTALL,
        )
        expected = [normalized_code(
            m.group("literate") if m.group("literate") is not None else m.group("fenced")
        ) for m in LITERATE_BLOCK.finditer(visible)]
        block_count += len(expected)
        markdown_blocks = [normalized_code(m.group("code"))
                           for m in FENCED_BLOCK.finditer(translated.read_text(encoding="utf-8"))]
        compare_blocks(expected, markdown_blocks, translated, errors)
        html_path = SITE / f"{slug}.html"
        if html_path in pages:
            compare_blocks(expected, pages[html_path].blocks, html_path, errors)
        download = SITE / "examples" / source.name
        if not download.is_file() or download.read_bytes() != source.read_bytes():
            errors.append(f"{label(download)}: downloadable example missing or changed")

    search_file = SITE / "search-index.js"
    entries = []
    try:
        script = search_file.read_text(encoding="utf-8")
        match = re.fullmatch(r"\s*window\.LH_SEARCH_INDEX\s*=\s*(\[.*\]);\s*", script, re.DOTALL)
        if match is None:
            raise ValueError("expected window.LH_SEARCH_INDEX=<JSON array>;")
        entries = json.loads(match.group(1))
        covered = set()
        for index, entry in enumerate(entries, 1):
            if not isinstance(entry, dict) or not all(
                isinstance(entry.get(key), str) for key in ("title", "url", "text")
            ):
                errors.append(f"docs/search-index.js: entry {index} lacks string title/url/text")
                continue
            check_link(SITE / "index.html", entry["url"],
                       f"search-index.js entry {index}", False, pages, errors)
            covered.add(urlsplit(entry["url"]).path)
        for name in [f"{slug}.html" for slug in CHAPTERS] + ["guide.html", "glossary.html", "about.html"]:
            if name not in covered:
                errors.append(f"docs/search-index.js: no searchable entry for {name}")
    except (OSError, ValueError) as error:
        errors.append(f"docs/search-index.js: {error}")

    if errors:
        print(f"FAILED: {len(errors)} site verification error(s)", file=sys.stderr)
        for error in errors:
            print(f"\n- {error}", file=sys.stderr)
        return 1
    print(
        f"Verified {len(pages)} Chinese HTML pages, {link_count} HTML links/assets, "
        f"{len(entries)} search entries, and {block_count} unchanged visible upstream "
        "code blocks in both Markdown and generated HTML."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
