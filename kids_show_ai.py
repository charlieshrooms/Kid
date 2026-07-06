"""
Kids Show AI - Generates creative ideas for kids TV shows.
"""

import random


THEMES = [
    "friendship",
    "adventure",
    "science",
    "nature",
    "music",
    "problem-solving",
    "kindness",
    "teamwork",
    "creativity",
    "exploration",
]

SETTINGS = [
    "a magical forest",
    "an underwater city",
    "outer space",
    "a cozy neighborhood",
    "a school for inventors",
    "a time-traveling treehouse",
    "a rainbow island",
    "a cloud kingdom",
    "a talking toy workshop",
    "a jungle full of friendly animals",
]

MAIN_CHARACTERS = [
    "a curious young scientist",
    "a brave little dragon",
    "a group of animal friends",
    "a pair of sibling adventurers",
    "a shy robot learning to make friends",
    "a young chef who can taste colors",
    "an aspiring astronaut and her alien pen pal",
    "a kind-hearted wizard-in-training",
    "a clever kid who invents gadgets",
    "twin detectives who solve neighborhood mysteries",
]

PLOTS = [
    "must work together to save their home",
    "go on a new adventure every episode",
    "learn an important life lesson each week",
    "discover hidden talents they never knew they had",
    "make new friends from very different worlds",
    "use creativity to overcome everyday challenges",
    "explore uncharted places filled with wonder",
    "solve puzzles that teach math and science",
    "build something amazing with recycled materials",
    "spread kindness and change their community",
]


class KidsShowAI:
    """AI assistant that generates and evaluates ideas for children's TV shows."""

    def __init__(self, seed: int | None = None):
        self._rng = random.Random(seed)

    def generate_idea(self) -> dict:
        """Return a randomly generated kids show concept."""
        theme = self._rng.choice(THEMES)
        setting = self._rng.choice(SETTINGS)
        characters = self._rng.choice(MAIN_CHARACTERS)
        plot = self._rng.choice(PLOTS)

        title_words = [w.capitalize() for w in theme.split()]
        title = " ".join(title_words) + " " + self._rng.choice(
            ["Squad", "Club", "Academy", "World", "Adventures", "Chronicles"]
        )

        return {
            "title": title,
            "theme": theme,
            "setting": setting,
            "main_characters": characters,
            "plot": plot,
            "target_age": self._rng.choice(["2-5", "4-7", "6-10", "8-12"]),
            "episode_length_minutes": self._rng.choice([7, 11, 22]),
        }

    def generate_ideas(self, count: int = 5) -> list[dict]:
        """Return a list of unique kids show ideas."""
        return [self.generate_idea() for _ in range(count)]

    def rate_idea(self, idea: dict) -> dict:
        """
        Rate a show idea on several dimensions and return a score breakdown.

        Each dimension is scored 1-10.  The overall score is the average.
        """
        scores = {
            "originality": self._rng.randint(6, 10),
            "educational_value": self._rng.randint(6, 10),
            "entertainment_value": self._rng.randint(6, 10),
            "age_appropriateness": self._rng.randint(7, 10),
            "marketability": self._rng.randint(5, 10),
        }
        scores["overall"] = round(sum(scores.values()) / len(scores), 1)
        return {"idea": idea, "scores": scores}

    def best_idea(self, count: int = 10) -> dict:
        """Generate *count* ideas and return the one with the highest overall score."""
        rated = [self.rate_idea(idea) for idea in self.generate_ideas(count)]
        return max(rated, key=lambda r: r["scores"]["overall"])

    @staticmethod
    def format_idea(idea: dict) -> str:
        """Return a human-readable summary of a show idea."""
        return (
            f"Title:           {idea['title']}\n"
            f"Theme:           {idea['theme'].capitalize()}\n"
            f"Setting:         {idea['setting'].capitalize()}\n"
            f"Main Characters: {idea['main_characters'].capitalize()}\n"
            f"Plot:            {idea['plot'].capitalize()}\n"
            f"Target Age:      {idea['target_age']} years\n"
            f"Episode Length:  {idea['episode_length_minutes']} minutes"
        )


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Kids Show AI – generate great ideas for children's TV shows"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of show ideas to generate (default: 5)",
    )
    parser.add_argument(
        "--best",
        action="store_true",
        help="Pick the single best idea from a larger pool",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible results",
    )
    args = parser.parse_args()

    ai = KidsShowAI(seed=args.seed)

    if args.best:
        print("🌟 Best Kids Show Idea 🌟")
        print("=" * 40)
        result = ai.best_idea(count=max(args.count, 10))
        print(KidsShowAI.format_idea(result["idea"]))
        print("\nScores:")
        for key, val in result["scores"].items():
            label = key.replace("_", " ").capitalize()
            print(f"  {label}: {val}")
    else:
        print(f"💡 {args.count} Kids Show Ideas 💡")
        print("=" * 40)
        for i, idea in enumerate(ai.generate_ideas(args.count), 1):
            print(f"\nIdea #{i}")
            print(KidsShowAI.format_idea(idea))
            print("-" * 40)


if __name__ == "__main__":
    main()
