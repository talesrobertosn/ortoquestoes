import { useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { criarBackup, validarBackup, restaurarBackup } from '../estado/backup'
export function BackupProgresso() {
  const { sessao } = usarConta()
  const [mensagem, definirMensagem] = useState('')
  if (!sessao) return <section className="backup-progresso empilha"><h2>Salve seu progresso</h2><p>Crie uma conta gratuita para guardar respostas, revisões, favoritas e histórico com segurança e acessar tudo em qualquer dispositivo.</p><a className="botao botao--principal" href="#/conta">Criar minha conta</a></section>
  function exportar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(criarBackup(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = `ortoquestoes-progresso-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    definirMensagem('Backup preparado para download.')
  }
  return <section className="backup-progresso empilha">
    <h2>Leve seu progresso com você</h2>
    <p>Exporte respostas, revisões, favoritas, anotações e histórico de sessões. Para continuar em outro navegador, importe o arquivo. A sessão em andamento não faz parte do backup.</p>
    <div className="linha"><button className="botao botao--principal" onClick={exportar}>Exportar progresso</button></div>
    <label className="campo">Restaurar um backup
      <input type="file" accept=".json,application/json" onChange={async e => {
        const arquivo = e.target.files?.[0]; e.target.value = ''
        if (!arquivo) return
        try {
          if (arquivo.size > 20 * 1024 * 1024) throw new Error('O arquivo é maior que o limite de 20 MB.')
          const backup = validarBackup(await arquivo.text())
          if (!window.confirm(`Restaurar ${Object.keys(backup.respondidas).length} questões respondidas e ${backup.favoritos.length} favoritas? Isso substitui o progresso e as anotações atuais. Exporte-os primeiro se quiser mantê-los.`)) return
          restaurarBackup(backup)
          definirMensagem('Backup restaurado. Recarregue a página para atualizar os indicadores.')
        } catch (erro) { definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível ler este arquivo.') }
      }} />
    </label>
    <p role="status" className="meta">{mensagem}</p>
  </section>
}
