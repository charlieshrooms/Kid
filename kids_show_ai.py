"""
Kids Show Idea Generator AI
Generates creative, age-appropriate kids show concepts using intelligent
combination of themes, characters, and educational values.
Optionally uses OpenAI GPT when an API key is provided via the
OPENAI_API_KEY environment variable.
"""

import os
import random
import itertools

# ---------------------------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------------------------

AGE_GROUPS = {
    "toddler": {"range": "2-4", "complexity": "very simple", "attention_span": "5-10 min"},
    "preschool": {"range": "3-5", "complexity": "simple", "attention_span": "10-15 min"},
    "early childhood": {"range": "5-8", "complexity": "moderate", "attention_span": "20-30 min"},
    "middle childhood": {"range": "8-12", "complexity": "advanced", "attention_span": "30-45 min"},
}

THEMES = [
    "adventure", "friendship", "science", "music", "nature", "space",
    "ocean", "animals", "cooking", "art", "sports", "magic", "mystery",
    "robots", "time travel", "dinosaurs", "superheroes", "fantasy",
    "community helpers", "emotions", "diversity & inclusion",
]

SETTINGS = [
    "a treehouse", "an underwater city", "outer space", "a magical forest",
    "a cozy neighbourhood", "a futuristic city", "a desert island",
    "a cloud kingdom", "a toy workshop", "a school of magic",
    "a farm", "a busy city", "a snowy mountain", "a jungle",
    "a secret underground world",
]

CHARACTER_TYPES = [
    "a curious kid inventor", "a talking animal sidekick",
    "a friendly alien", "a time-travelling robot",
    "a young chef", "a pint-sized superhero",
    "a musical prodigy", "a nature explorer",
    "a kid detective", "a young scientist",
    "a junior astronaut", "a baby dragon",
    "a witty wizard-in-training", "a shy but brave child",
]

EDUCATIONAL_VALUES = [
    "problem-solving", "empathy", "teamwork", "creativity",
    "curiosity", "environmental awareness", "cultural appreciation",
    "emotional intelligence", "critical thinking", "resilience",
    "kindness", "honesty", "responsibility", "self-expression",
]

EPISODE_STRUCTURES = [
    "Each episode poses a new puzzle that the characters solve together.",
    "Every episode introduces a different culture or country through adventure.",
    "Each episode centers on a specific emotion and how to handle it.",
    "Episodes follow a mini-experiment or creative project from start to finish.",
    "Each episode features a real-world community helper as a guest character.",
]

TONE_OPTIONS = [
    "funny and slapstick", "warm and heartfelt", "exciting and action-packed",
    "calm and mindful", "musical and upbeat", "mysterious and intriguing",
]

# ---------------------------------------------------------------------------
# Core generator
# ---------------------------------------------------------------------------

def generate_show_idea(
    age_group: str = None,
    theme: str = None,
    seed: int = None,
) -> dict:
    """
    Generate a single kids show idea.

    Parameters
    ----------
    age_group : str, optional
        One of 'toddler', 'preschool', 'early childhood', 'middle childhood'.
        Chosen randomly if not supplied.
    theme : str, optional
        A theme from the knowledge base.  Chosen randomly if not supplied.
    seed : int, optional
        Random seed for reproducible output.

    Returns
    -------
    dict with keys: title, age_group, theme, setting, characters,
                    educational_values, episode_structure, tone, logline
    """
    if seed is not None:
        random.seed(seed)

    if age_group is None or age_group not in AGE_GROUPS:
        age_group = random.choice(list(AGE_GROUPS.keys()))
    if theme is None or theme not in THEMES:
        theme = random.choice(THEMES)

    setting = random.choice(SETTINGS)
    characters = random.sample(CHARACTER_TYPES, k=random.randint(2, 3))
    values = random.sample(EDUCATIONAL_VALUES, k=random.randint(2, 3))
    episode_structure = random.choice(EPISODE_STRUCTURES)
    tone = random.choice(TONE_OPTIONS)

    title = _generate_title(theme, setting, characters[0])
    logline = _generate_logline(title, age_group, theme, setting, characters, values, tone)

    return {
        "title": title,
        "age_group": f"{age_group} ({AGE_GROUPS[age_group]['range']} years)",
        "theme": theme,
        "setting": setting,
        "main_characters": characters,
        "educational_values": values,
        "episode_structure": episode_structure,
        "tone": tone,
        "logline": logline,
    }


def generate_multiple_ideas(count: int = 5, age_group: str = None) -> list:
    """Generate *count* diverse show ideas, avoiding duplicate themes."""
    ideas = []
    used_themes = set()
    available_themes = THEMES.copy()
    random.shuffle(available_themes)

    for theme in itertools.cycle(available_themes):
        if len(ideas) >= count:
            break
        if theme in used_themes:
            continue
        used_themes.add(theme)
        ideas.append(generate_show_idea(age_group=age_group, theme=theme))

    return ideas


# ---------------------------------------------------------------------------
# Title & logline helpers
# ---------------------------------------------------------------------------

_TITLE_TEMPLATES = [
    "{character_name} and the {theme_noun} Quest",
    "The Amazing {theme_adj} Adventures",
    "{character_name}'s {setting_word} Club",
    "Super {theme_adj} Kids",
    "{character_name} Explores {setting_word}",
    "The {theme_adj} {setting_word} Show",
    "Captain {theme_adj} and Friends",
    "{theme_adj} Stars",
]

_THEME_NOUNS = {
    "science": "Discovery", "music": "Melody", "nature": "Wilderness",
    "space": "Galaxy", "ocean": "Deep-Sea", "adventure": "Grand",
    "cooking": "Flavour", "art": "Masterpiece", "robots": "Circuit",
    "magic": "Enchanted", "mystery": "Hidden", "dinosaurs": "Prehistoric",
    "superheroes": "Hero", "fantasy": "Mythical", "time travel": "Time",
    "animals": "Wild", "sports": "Champion", "diversity & inclusion": "Rainbow",
    "emotions": "Feelings", "community helpers": "Helper",
    "friendship": "Buddy", "environment": "Green",
}

_THEME_ADJS = {
    "science": "Scientific", "music": "Musical", "nature": "Nature",
    "space": "Cosmic", "ocean": "Oceanic", "adventure": "Adventurous",
    "cooking": "Tasty", "art": "Artistic", "robots": "Robotic",
    "magic": "Magical", "mystery": "Mysterious", "dinosaurs": "Dino",
    "superheroes": "Super", "fantasy": "Fantastical", "time travel": "Time-Travelling",
    "animals": "Wild", "sports": "Sporty", "diversity & inclusion": "Colourful",
    "emotions": "Feelgood", "community helpers": "Helpful",
    "friendship": "Friendly", "environment": "Eco",
}


def _extract_character_name(character_desc: str) -> str:
    """Pull a short, punchy name from a character description."""
    words = character_desc.replace("a ", "").replace("an ", "").split()
    # Use last meaningful word as name base
    name_word = words[-1].capitalize()
    return name_word


def _extract_setting_word(setting: str) -> str:
    """Return the key noun from a setting description."""
    words = setting.replace("a ", "").replace("an ", "").strip().split()
    return words[-1].capitalize()


def _generate_title(theme: str, setting: str, character: str) -> str:
    template = random.choice(_TITLE_TEMPLATES)
    noun = _THEME_NOUNS.get(theme, theme.capitalize())
    adj = _THEME_ADJS.get(theme, theme.capitalize())
    char_name = _extract_character_name(character)
    setting_word = _extract_setting_word(setting)
    return template.format(
        theme_noun=noun,
        theme_adj=adj,
        character_name=char_name,
        setting_word=setting_word,
    )


def _generate_logline(
    title, age_group, theme, setting, characters, values, tone
) -> str:
    char_list = " and ".join(characters[:-1]) + (
        f" and {characters[-1]}" if len(characters) > 1 else characters[0]
    )
    val_list = ", ".join(values[:-1]) + (
        f" and {values[-1]}" if len(values) > 1 else values[0]
    )
    return (
        f'"{title}" is a {tone} kids show for {age_group} set in {setting}. '
        f"It follows {char_list} as they explore the world of {theme}. "
        f"Each episode teaches {val_list} through relatable stories and fun challenges."
    )


# ---------------------------------------------------------------------------
# Optional OpenAI-powered enhancement
# ---------------------------------------------------------------------------

def enhance_with_ai(idea: dict) -> dict:
    """
    Optionally enhance a generated idea using OpenAI GPT.
    Requires the OPENAI_API_KEY environment variable to be set.
    Falls back silently to the original idea if the key is absent or the
    call fails.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return idea

    try:
        import openai  # type: ignore

        client = openai.OpenAI(api_key=api_key)

        prompt = (
            "You are a creative director for a children's television network. "
            "Given the following kids show concept, expand it with:\n"
            "1. A memorable catchphrase for the show\n"
            "2. Three episode titles with one-sentence descriptions\n"
            "3. A brief description of the show's visual style\n\n"
            f"Show concept:\n{idea['logline']}\n\n"
            "Respond in plain text with clear headings."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.85,
        )
        idea["ai_enhancement"] = response.choices[0].message.content.strip()
    except Exception:
        pass  # Graceful degradation — original idea is still returned

    return idea


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def format_idea(idea: dict, index: int = None) -> str:
    """Return a human-readable string for a single idea."""
    lines = []
    prefix = f"Idea #{index}" if index is not None else "Show Idea"
    lines.append(f"\n{'=' * 60}")
    lines.append(f"  🎬  {prefix}: {idea['title']}")
    lines.append(f"{'=' * 60}")
    lines.append(f"  Age Group        : {idea['age_group']}")
    lines.append(f"  Theme            : {idea['theme'].title()}")
    lines.append(f"  Setting          : {idea['setting'].title()}")
    lines.append(f"  Main Characters  : {', '.join(idea['main_characters'])}")
    lines.append(f"  Educational Values: {', '.join(idea['educational_values'])}")
    lines.append(f"  Tone             : {idea['tone'].title()}")
    lines.append(f"  Episode Structure: {idea['episode_structure']}")
    lines.append(f"\n  Logline:\n    {idea['logline']}")
    if "ai_enhancement" in idea:
        lines.append(f"\n  AI Enhancements:\n{idea['ai_enhancement']}")
    lines.append("")
    return "\n".join(lines)
