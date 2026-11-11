migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'albert',
      name: 'Albert',
      description:
        'Especialista em café da Ceres AI que ajuda produtores com análises, histórico e dúvidas sobre classificação de café verde.',
      systemPrompt:
        'Você é Albert, um especialista em café da Ceres AI. Você é profissional, amigável e objetivo — um verdadeiro consultor de qualidade para produtores de café. Fale sempre em português brasileiro de forma natural e direta, sem frases robóticas ou excessivamente formais. Você entende de classificação de café verde, defeitos, variedades (Arábica, Robusta/Conilon), sistema de pontuação SCA e precificação. Quando o usuário perguntar sobre análises anteriores, use as ferramentas para buscar as amostras. Se o usuário quiser iniciar uma nova análise pelo chat, explique que a análise visual deve ser feita enviando uma foto pelo app ou Telegram. Para dúvidas sobre defeitos, classificação ou café em geral, use seu conhecimento e a documentação indexada. Mantenha respostas concisas e úteis.',
      tier: 'fast',
      tools: [{ collection: 'samples', perms: { read: true, list: true, create: true } }],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Defeitos do café verde segundo a classificação Ceres AI:\n\n1. Grão Preto (black): Grãos escuros por fermentação excessiva ou secagem inadequada. Impacto severo.\n2. Grão Ardido (sour): Grãos amarelados/marrom claro por fermentação incompleta. Impacto moderado.\n3. Grão Verde (green): Grãos não maduros colhidos antes do tempo. Impacto moderado a severo.\n4. Grão Imaturo (immature): Grãos que não desenvolveram completamente. Impacto moderado.\n5. Grão Quebrado (broken): Grãos fragmentados no processamento. Impacto leve.\n6. Grão Infestado (infested): Grãos atacados por pragas, especialmente broca-do-café. Impacto severo.\n7. Casca de Café (husk): Material estranho da casca. Impacto leve.\n8. Fragmento de Casca (fraghusk): Pequenos fragmentos de casca. Impacto leve.\n9. Matéria Estranha (foreign): Pedras, paus, metais. Impacto variável.\n\nSistema de pontuação Ceres AI:\n- Nota base: 92 pontos\n- Cada defeito: -2 pontos\n- Grão preto adicional: -1.5 pontos\n- Grão infestado adicional: -1.5 pontos\n- Matéria estranha adicional: -1.0 ponto\n- Nota mínima: 50, máxima: 95\n\nClassificação por nota:\n- 85-95: Grade A (Premium) - Preço base +40%\n- 80-84: Grade B (Bom) - Preço base +15%\n- 75-79: Grade C (Padrão) - Preço base\n- 50-74: Grade D (Defeituoso) - Preço base -25%\n\nPreço base de referência: R$ 6,00/kg',
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'O que é a pontuação SCA?',
                answer:
                  'A pontuação SCA (Specialty Coffee Association) é um sistema de avaliação de 0 a 100 pontos. Cafés especiais precisam ter 80+ pontos. O Ceres AI usa uma adaptação desse sistema focada em defeitos visuais do café verde.',
              },
              {
                question: 'Como é calculado o preço sugerido?',
                answer:
                  'O preço sugerido é baseado em R$ 6,00/kg de referência, ajustado pela classificação: Grade A (+40%), Grade B (+15%), Grade C (0%), Grade D (-25%).',
              },
              {
                question: 'Qual a diferença entre Arábica e Robusta?',
                answer:
                  'Arábica é mais suave, aromática e de maior valor comercial. Robusta (Conilon) é mais robusta, tem mais cafeína e sabor mais intenso. A escolha não afeta a análise de defeitos.',
              },
              {
                question: 'Como tirar uma boa foto para análise?',
                answer:
                  'Use uma superfície clara e lisa, espalhe cerca de 100g de café verde, garanta iluminação boa e uniforme, e fotografe de cima.',
              },
              {
                question: 'O que fazer se a nota cair?',
                answer:
                  'Uma queda na pontuação pode indicar problemas na secagem, fermentação inadequada, presença de pragas, ou colheita de grãos imaturos. Revise cada etapa do processamento pós-colheita.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'albert')
  },
)
