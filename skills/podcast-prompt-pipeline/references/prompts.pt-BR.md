# Prompts originais (pt-BR)

Reproduzidos **literalmente** do repositório [prompts_for_podcast_by-IA](https://github.com/Vivianflima/prompts_for_podcast_by-IA) de Vivian Lima, projeto do Bootcamp Santander 2024 — Fundamentos de IA para Devs (DIO). Não edite estes textos: eles são a referência. As adaptações vivem em [prompts.en.md](prompts.en.md).

Contexto do projeto original: podcast *PodQAst Inteligente*, sobre Qualidade de Software (QA) e o uso de IA em testes. Roteiro no ChatGPT, áudio no ElevenLabs, tratamento no CapCut.

---

## 🤖 1. Prompt para o título

```
"Você é um roteirista de podcast, e vamos criar um podcast de tecnologia, focado em Qualidade de Software (QA) e Testes  e eu gostaria de uma ajuda sua para criar 5 sugestões
de nomes criativos para um podcast de QA focado em inovações e inteligência artificial
O podcast vai falar sobre dicas e novidades sobre o mundo do QA e Testes e o que está acontecendo no mercado de inteligência artificial e o uso de IA em QA e Testes de Software"
```

## 🤖 2. Prompt para o roteiro

```
"O formato do roteiro deve ser
[INTRODUÇÃO]
[CURIOSIDADE 1]
[CURIOSIDADE 2]
[FINALIZAÇÃO]

{REGRAS}

- no bloco [INTRODUÇÃO] substitua por uma introdução iguais as introduções dos vídeos do Podcast  'mamilos', como se fossem escritos por Ju Valawer e Cris Bartis
- no bloco [CURIOSIDADE 1] substitua por uma curiosidade Qualidade de Software
- no bloco [CURIOSIDADE 2] sobre uma ferramenta de IA para Testes
- no bloco [FINALIZAÇÃO] substitua por uma despedida cool com o final 'Eu sou a Vivi e esse foi o PodQAst Inteligente dessa semana'
- use termos de fácil explicação
- O podcast vai ser apresentado somente por uma pessoa, chamada Vivi
- O podcast deve ser curto

{REGRAS NEGATIVAS}

- Não use muitos termos técnicos
- Não ultrapasse 5 minutos de duração"
```

---

## Como usar estes prompts

1. **Título.** Rode o prompt 1 trocando o nicho, o público e o nome do show. Peça 5 sugestões, escolha uma, guarde em `brief.md`. Nomes de podcast precisam ser ditos em voz alta na abertura sem precisar de soletração.
2. **Roteiro.** Rode o prompt 2 com o nicho e os dois pontos de curiosidade do episódio. Se o modelo devolver texto acima de ~700 palavras, ele violou a regra de duração: peça corte, não corte você mesmo (cortar à mão quebra a progressão da abertura).
3. **Assinatura.** A frase final `"Eu sou a Vivi e esse foi o PodQAst Inteligente dessa semana"` é fixa. Em uma série, ela é a identidade sonora do programa — mantenha a mesma redação e a mesma entonação em todos os episódios, mudando apenas o nome do apresentador quando mudar de fato.
4. **Voz.** O original usou ElevenLabs. O `tts.mjs` aceita ElevenLabs, OpenAI, `say` (macOS) e `espeak-ng`; a configuração fica em `voices.json` e é fixa para todos os blocos.

## Observações sobre o formato do bloco

O projeto original usa `[INTRODUÇÃO]`; este skill grafa `ABERTURA` no `script.md` porque o bloco é um cold open, não uma introdução formal — mas os dois nomes são aceitos pelo validador. Se você está reproduzindo o episódio original ao pé da letra, use `INTRODUÇÃO` e mantenha o resto idêntico.

Adaptação de referência de tom: as introduções do podcast *Mamilos* (Ju Wallauer e Cris Bartheis) — conversa direta, sem locução de rádio, uma pergunta ao ouvinte na primeira frase.
