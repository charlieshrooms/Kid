"""
CLI entry point for the Kids Show Idea Generator AI.

Usage
-----
    python main.py                        # Generate 5 random ideas
    python main.py --count 3              # Generate 3 ideas
    python main.py --age preschool        # Ideas for a specific age group
    python main.py --theme space          # Ideas around a specific theme
    python main.py --enhance              # Enhance ideas with OpenAI (needs OPENAI_API_KEY)
    python main.py --interactive          # Interactive Q&A mode
"""

import argparse
import sys

from kids_show_ai import (
    AGE_GROUPS,
    THEMES,
    enhance_with_ai,
    format_idea,
    generate_multiple_ideas,
    generate_show_idea,
)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Kids Show Idea Generator AI — get creative show concepts instantly!",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--count", "-n",
        type=int,
        default=5,
        help="Number of show ideas to generate (default: 5)",
    )
    parser.add_argument(
        "--age", "-a",
        choices=list(AGE_GROUPS.keys()),
        default=None,
        help="Target age group (default: random)",
    )
    parser.add_argument(
        "--theme", "-t",
        choices=THEMES,
        default=None,
        help="Theme for the show (default: random)",
    )
    parser.add_argument(
        "--enhance", "-e",
        action="store_true",
        help="Enhance ideas with OpenAI GPT (requires OPENAI_API_KEY env var)",
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Launch interactive Q&A mode",
    )
    return parser.parse_args(argv)


def interactive_mode(enhance: bool = False):
    """Walk the user through generating a customised show idea."""
    print("\n🎨  Welcome to the Kids Show Idea Generator!\n")

    # Age group
    print("Available age groups:")
    for key, info in AGE_GROUPS.items():
        print(f"  • {key:20s} ({info['range']} years)")
    age = input("\nEnter age group (or press Enter to skip): ").strip().lower() or None
    if age and age not in AGE_GROUPS:
        print(f"  ⚠  Unknown age group '{age}' — choosing randomly.")
        age = None

    # Theme
    print("\nAvailable themes:")
    for i, t in enumerate(THEMES, 1):
        end = "\n" if i % 4 == 0 else "  "
        print(f"  {i:2}. {t:<25}", end=end)
    print()
    theme_input = input("\nEnter a theme (or press Enter to skip): ").strip().lower() or None
    if theme_input and theme_input not in THEMES:
        print(f"  ⚠  Unknown theme '{theme_input}' — choosing randomly.")
        theme_input = None

    # Number of ideas
    try:
        count = int(input("\nHow many ideas would you like? (default 3): ").strip() or 3)
    except ValueError:
        count = 3

    ideas = []
    if theme_input:
        for _ in range(count):
            ideas.append(generate_show_idea(age_group=age, theme=theme_input))
    else:
        ideas = generate_multiple_ideas(count=count, age_group=age)

    if enhance:
        print("\n✨  Enhancing ideas with AI...")
        ideas = [enhance_with_ai(idea) for idea in ideas]

    for i, idea in enumerate(ideas, 1):
        print(format_idea(idea, index=i))

    print("\n💡  Tip: Run with --enhance to get AI-powered catchphrases and episode ideas!")


def batch_mode(args):
    """Generate ideas non-interactively and print them."""
    print(f"\n🎬  Generating {args.count} kids show idea(s)...\n")

    if args.theme:
        ideas = [
            generate_show_idea(age_group=args.age, theme=args.theme)
            for _ in range(args.count)
        ]
    else:
        ideas = generate_multiple_ideas(count=args.count, age_group=args.age)

    if args.enhance:
        print("✨  Enhancing ideas with AI (this may take a moment)...")
        ideas = [enhance_with_ai(idea) for idea in ideas]

    for i, idea in enumerate(ideas, 1):
        print(format_idea(idea, index=i))

    print(f"\n✅  Generated {len(ideas)} idea(s). Happy creating!\n")


def main(argv=None):
    args = parse_args(argv)

    if args.interactive:
        interactive_mode(enhance=args.enhance)
    else:
        batch_mode(args)


if __name__ == "__main__":
    sys.exit(main())
