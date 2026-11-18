# Kit de reedição Naper

**Para você:** o Claude pega os seus vídeos que mais venderam e monta vídeos novos, naturais, só com cortes: o melhor gancho de um, a prova do outro, a frase que vende do terceiro. Nada de efeito por cima: fica com a sua cara. Você acompanha no painel, em **Ver o editor**.

Peça pela Biblioteca (função 3) ou assim:
- "Reedita os meus 2 vídeos que mais venderam em 3 versões com ganchos diferentes."
- "Faz uma versão curta, de 20 segundos, do meu vídeo campeão."
- "Junta a pergunta da cliente desse vídeo com a demonstração daquele."

Os vídeos ficam em `estudio/brutos` e os prontos em `estudio/editados`.

**Para o Claude:** leia `kit-reedicao/CLAUDE.md`.
- `transcrever.mjs <video> [--trabalho id]`: frases com início e fim (whisper.cpp local).
- `reeditar.mjs <receita.json>`: corta e junta os trechos, fade curto no áudio, folha de quadros e progresso no painel.
- `folha.mjs <video> [quadros] [--trabalho id]`: folha de quadros para conferir sem abrir o vídeo.
