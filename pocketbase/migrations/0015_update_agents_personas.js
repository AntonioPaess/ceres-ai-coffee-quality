migrate(
  (app) => {
    var updates = [
      {
        oldSlug: 'albert',
        newSlug: 'albert',
        name: 'Albert',
        description:
          'É quem você conhece. Conversa com você no Telegram, analisa suas amostras, gera laudos, responde perguntas. É o único que fala diretamente com você — todos os outros agentes passam as mensagens deles através dele. Sempre ativo, não conta no limite de 3.',
        defaultFrequency: 'continuous',
      },
      {
        oldSlug: 'market',
        newSlug: 'mercurio',
        name: 'Mercúrio',
        description:
          'Roda todo dia. De olho no preço do café, no dólar, na bolsa e no mercado internacional. Só te procura quando há algo que realmente importa pro seu bolso. Exemplo: "O Arábica subiu 2,3% hoje. Seu último lote está mais valorizado do que na data da análise."',
        defaultFrequency: 'daily',
      },
      {
        oldSlug: 'executive',
        newSlug: 'jano',
        name: 'Jano',
        description:
          'Roda toda semana. Jano é o deus de duas faces — uma olha pra trás, outra pra frente. Ele fecha sua semana com um resumo: quantas análises, nota média, melhor e pior lote, principais defeitos — e já aponta o que esperar da próxima.',
        defaultFrequency: 'weekly',
      },
      {
        oldSlug: 'evolution',
        newSlug: 'flora',
        name: 'Flora',
        description:
          'Roda toda semana. Enquanto Ceres cuida da colheita, Flora cuida do florescimento — acompanha a evolução da sua qualidade ao longo do tempo, aponta tendências e defeitos recorrentes. Exemplo: "Sua nota média aumentou 1,4 ponto nas últimas quatro semanas."',
        defaultFrequency: 'weekly',
      },
      {
        oldSlug: 'alerts',
        newSlug: 'eolo',
        name: 'Éolo',
        description:
          'Roda continuamente, mas fala pouco — só quando importa de verdade. Éolo, deus dos ventos, monitora geada, seca, mudanças bruscas no mercado e notícias relevantes. Sem spam, só o essencial.',
        defaultFrequency: 'continuous',
      },
      {
        oldSlug: 'educator',
        newSlug: 'minerva',
        name: 'Minerva',
        description:
          'Roda uma vez por semana. Deusa da sabedoria, traz uma dica personalizada — sobre classificação, defeitos, boas práticas, pós-colheita — sempre considerando o seu histórico.',
        defaultFrequency: 'weekly',
      },
      {
        oldSlug: 'consultant',
        newSlug: 'apolo',
        name: 'Apolo',
        description:
          'Roda toda semana. Deus dos oráculos, Apolo analisa todas as suas análises e devolve recomendações práticas. Exemplo: "Observei recorrência de grãos verdes nos seus lotes. Melhorar essa etapa pode aumentar sua nota média."',
        defaultFrequency: 'weekly',
      },
    ]

    for (var i = 0; i < updates.length; i++) {
      var u = updates[i]
      try {
        var record = app.findFirstRecordByData('agents', 'slug', u.oldSlug)
        record.set('slug', u.newSlug)
        record.set('name', u.name)
        record.set('description', u.description)
        record.set('defaultFrequency', u.defaultFrequency)
        app.save(record)
      } catch (_) {}
    }
  },
  (app) => {
    var reverts = [
      {
        newSlug: 'albert',
        oldSlug: 'albert',
        name: 'Albert',
        description:
          'Assistente principal da Ceres AI. Sempre ativo para análises, dúvidas e gestão via Telegram.',
        defaultFrequency: 'continuous',
      },
      {
        newSlug: 'mercurio',
        oldSlug: 'market',
        name: 'Market',
        description: 'Monitora o mercado de café verde e envia insights sobre preços e tendências.',
        defaultFrequency: 'daily',
      },
      {
        newSlug: 'jano',
        oldSlug: 'executive',
        name: 'Executive',
        description: 'Gera resumos executivos da qualidade das suas amostras e indicadores-chave.',
        defaultFrequency: 'daily',
      },
      {
        newSlug: 'flora',
        oldSlug: 'evolution',
        name: 'Evolution',
        description:
          'Acompanha a evolução da qualidade do seu café ao longo do tempo e identifica padrões.',
        defaultFrequency: 'weekly',
      },
      {
        newSlug: 'eolo',
        oldSlug: 'alerts',
        name: 'Alerts',
        description: 'Detecta quedas de qualidade e anomalias, enviando alertas proativos.',
        defaultFrequency: 'continuous',
      },
      {
        newSlug: 'minerva',
        oldSlug: 'educator',
        name: 'Educator',
        description:
          'Envia dicas educativas sobre cultivo, secagem, fermentação e classificação de café.',
        defaultFrequency: 'weekly',
      },
      {
        newSlug: 'apolo',
        oldSlug: 'consultant',
        name: 'Consultant',
        description: 'Fornece recomendações consultivas baseadas no histórico das suas amostras.',
        defaultFrequency: 'weekly',
      },
    ]

    for (var i = 0; i < reverts.length; i++) {
      var r = reverts[i]
      try {
        var record = app.findFirstRecordByData('agents', 'slug', r.newSlug)
        record.set('slug', r.oldSlug)
        record.set('name', r.name)
        record.set('description', r.description)
        record.set('defaultFrequency', r.defaultFrequency)
        app.save(record)
      } catch (_) {}
    }
  },
)
