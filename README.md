# Kid — Kids Show Idea Generator AI

An AI-powered tool that generates creative, age-appropriate kids TV show concepts. It combines themes, characters, settings, and educational values to produce unique show ideas instantly. Optionally integrates with OpenAI GPT to expand ideas further.

## Features

- Generates detailed kids show concepts including title, logline, characters, setting, and educational values
- Supports four age groups: toddler, preschool, early childhood, and middle childhood
- 20+ themes (space, science, music, nature, dinosaurs, superheroes, and more)
- Interactive Q&A mode for guided idea generation
- Optional OpenAI GPT enhancement for catchphrases, episode titles, and visual style descriptions

## Quick Start

```bash
# Generate 5 random ideas (no dependencies needed)
python main.py

# Generate 3 ideas for preschoolers
python main.py --count 3 --age preschool

# Generate ideas around a specific theme
python main.py --theme space

# Interactive guided mode
python main.py --interactive

# Enhance ideas with OpenAI GPT (requires API key)
export OPENAI_API_KEY=your_key_here
python main.py --enhance
```

## Optional AI Enhancement

Install the OpenAI library for GPT-powered enhancements:

```bash
pip install -r requirements.txt
```

Then set your API key and use the `--enhance` flag.

## Use as a Library

```python
from kids_show_ai import generate_show_idea, generate_multiple_ideas, format_idea

# Generate one idea
idea = generate_show_idea(age_group="preschool", theme="space")
print(format_idea(idea))

# Generate 5 diverse ideas
ideas = generate_multiple_ideas(count=5)
for i, idea in enumerate(ideas, 1):
    print(format_idea(idea, index=i))
```
