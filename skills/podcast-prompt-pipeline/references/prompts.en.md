# Prompts (English adaptation)

An adaptation of the original Portuguese prompts in [prompts.pt-BR.md](prompts.pt-BR.md) — same structure, same rules, retargeted to English-language shows. Keep both files together: the Portuguese set is the source of record, this one is the working copy for English production.

## 1. Title prompt

```
You are a podcast writer. We're making a technology podcast focused on software quality (QA) and testing, and I want your help proposing 5 creative names for a QA podcast centred on innovation and artificial intelligence.
The show covers tips and news from the world of QA and testing, what's happening in the AI market, and how AI is being used in QA and software testing.
Constraints: each name must be sayable in one breath on air, must not need spelling out, must be 1–3 words, and must not already be a well-known show. For each, give a one-line rationale and the tagline the host would say after it.
```

## 2. Script prompt

```
The script format must be:

[OPENING]
[CURIOSITY 1]
[CURIOSITY 2]
[SIGN-OFF]

{RULES}

- Replace [OPENING] with a cold open in the spirit of conversation-first interview podcasts: no radio announcer voice, no "hello and welcome to another episode" — start with one concrete thing the listener can picture, then say the show name, then promise what today's episode delivers.
- Replace [CURIOSITY 1] with one curiosity about software quality.
- Replace [CURIOSITY 2] with one AI tool or technique for testing, something the listener could try this week.
- Replace [SIGN-OFF] with a cool goodbye that ends with the fixed line: "I'm Vivi and that was PodQAst Inteligente for this week."
- Explain everything in plain terms; when a technical word is unavoidable, gloss it in the same sentence.
- The show has a single host, named Vivi.
- The episode must be short.
- Sentences under 20 words. One idea per sentence. No lists, no markdown, no stage directions.
- Write numbers and abbreviations the way they are spoken ("2024" -> "twenty twenty-four", "QA" -> "cue-ay").

{NEGATIVE RULES}

- Don't use many technical terms.
- Don't exceed 5 minutes of runtime.
```

## 3. Show-notes prompt

```
You are the producer of PodQAst Inteligente. From the episode script below, write the show notes:
- a 3-sentence summary that would make someone press play
- three bullets, one per promise point, each naming the concrete thing the listener will learn
- one link or search term per bullet (mark anything you are not sure about as [VERIFY])
- the sign-off line as a quote
Keep it under 150 words. Do not invent statistics, benchmarks or dates that are not in the script.
```

## 4. Retargeting checklist

Replace these five things and the prompts work for any subject: the **niche** (software quality), the **audience**, the **host name**, the **fixed sign-off**, and the **two promise points**. Everything else in the prompt set is craft, and should survive untouched.

The tone reference in the original is the Brazilian podcast *Mamilos* (Ju Wallauer and Cris Bartheis): direct, conversational, one question to the listener in the first sentence, zero announcer affect. The nearest English reference points are conversational interview shows rather than produced radio.
