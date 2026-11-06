---
slug: podqa-01
title: "PodQAst Inteligente #01 — O bug que ninguém viu"
show: PodQAst Inteligente
host: Vivi
language: pt-BR
target_seconds: 250
cap_seconds: 300
signoff: "Eu sou a Vivi e esse foi o Podcast Inteligente dessa semana."   # the written brand is PodQAst; it is spoken as "Podcast"
---

## ABERTURA

<!-- The show is written PodQAst Inteligente and spoken "Podcast Inteligente" — the QA is a pun
     you can only see, and the voice must not try to pronounce it. -->

VIVI: Imagina que você sobe uma alteração de uma linha só. Uma linha. E ela derruba o login de todo mundo. Se você trabalha com software, você já viu isso de perto, ou vai ver ainda essa semana.
Eu sou a Vivi, e esse é o Podcast Inteligente, o programa que explica qualidade de software sem falar difícil.
Hoje eu trago duas coisas. Uma história de um erro que ninguém conseguiu ver, e uma ferramenta de inteligência artificial que você pode testar hoje, de graça, no seu próprio computador.

## CURIOSIDADE 1 — O erro invisível

VIVI: Em mil novecentos e noventa e nove, a agência espacial americana perdeu uma sonda em Marte. A sonda custou cento e vinte e cinco milhões de dólares, e o motivo da perda foi uma unidade de medida.
Uma equipe calculou a força em uma unidade, e a outra equipe esperava outra. Ninguém errou a conta. Todo mundo fez a conta certa, com a unidade errada.
O software não reclamou, porque para ele o número estava perfeito. E o foguete foi para o lugar errado.
Repara no padrão. Não foi falta de gente boa. Não foi falta de teste. Foi falta de um teste específico, aquele que compara o que uma parte do sistema entrega com o que a outra parte espera receber.
Isso tem nome em qualidade de software, e é chato de dizer: teste de contrato. A ideia é simples. Antes de testar se a conta está certa, você testa se as duas pontas estão falando a mesma língua.
Na prática, é uma pergunta só, feita em voz alta na reunião: quem consome esse dado espera o quê, exatamente? Quase todo bug caro começa com essa pergunta sem resposta.

## CURIOSIDADE 2 — Uma ferramenta de IA para testar

VIVI: Agora a parte prática. Você tem uma função que valida um formulário, e você não tem ideia de todos os casos estranhos que podem chegar nela.
Abre um chat de inteligência artificial e cola a função. Junto com a função, cola esta frase: liste os casos de borda que quebram essa função, incluindo entradas vazias, entradas gigantes e caracteres que não deveriam existir.
Ele vai te devolver uma lista. E aqui vem o pulo do gato: a lista é uma proposta, não uma verdade. Leia caso por caso e pergunte se aquilo pode mesmo acontecer no seu sistema.
Os que puderem, viram teste de verdade, na sua ferramenta de teste de sempre. Os que não puderem, você descarta sem culpa.
Isso funciona porque a máquina é boa em imaginar o improvável, e você é bom em saber o que importa. Um faz a lista, o outro corta.
O cuidado é um só. A ferramenta não conhece a sua regra de negócio, então ela inventa requisito com muita confiança. Se você aceitar a lista inteira sem revisar, você ganha um monte de teste bonito que testa a coisa errada.

## FINALIZAÇÃO

VIVI: Fica uma ideia só dessa conversa. O bug caro quase nunca está na conta. Ele está na conversa que ninguém teve.
Então essa semana, escolhe uma parte do seu sistema e pergunta em voz alta quem consome aquilo, e o que essa pessoa espera receber.
Eu sou a Vivi e esse foi o Podcast Inteligente dessa semana.
