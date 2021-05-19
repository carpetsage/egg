#!/usr/bin/env python3

import argparse
import logging
import os
import pathlib
import sys


here = pathlib.Path(__file__).parent.resolve()
wasmegg_root = here.parent.resolve()
template_dir = wasmegg_root / "_template"


def init_from_template(id: str, title: str):
    destdir = wasmegg_root / id
    if destdir.exists():
        logging.critical(f"{destdir} exists")
        sys.exit(1)
    for subdir_path, _, files in os.walk(template_dir):
        subdir = pathlib.Path(subdir_path)
        reldir = subdir.relative_to(template_dir)
        destsubdir = destdir / reldir
        print(destsubdir.relative_to(wasmegg_root))
        destsubdir.mkdir()
        for file in files:
            srcpath = subdir / file
            destpath = destsubdir / file
            print(destpath.relative_to(wasmegg_root))
            with srcpath.open() as fp:
                content = fp.read()
            content = content.replace("@@ID@@", id).replace("@@TITLE@@", title)
            with destpath.open("w") as fp:
                fp.write(content)


def main():
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("id", help='e.g. "past-contracts"')
    parser.add_argument(
        "title",
        nargs="?",
        help='e.g. "Past contracts viewer"; if not specified, the id is dehyphenated then capitalized as the title',
    )
    args = parser.parse_args()

    if " " in args.id:
        logging.critical("id not allowed to have spaces")
        sys.exit(1)

    if args.title is None:
        args.title = args.id.replace("-", " ").capitalize()
        logging.info(f"Using title: {args.title}")

    init_from_template(args.id, args.title)


if __name__ == "__main__":
    main()
