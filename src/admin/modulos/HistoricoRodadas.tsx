import { useEffect, useState } from 'react'
import { chamarFuncao } from '../../servicos/supabase'
import { dataHora, diaDaSerie } from '../ui/formato'
import { Painel, Carregando, Faixa } from '../ui/kit'
import { PreviaCarta } from './cartas-comum'
import type { MensagemHub } from '../../../supabase/functions/_shared/hub-regras'
interface Dados {
  rodadas: Array<{
    id: string
    dia: string
    status: string
    criado_em: string
    resumo?: { excluidas?: Array<{ nome: string; motivo: string }> }
  }>
  rodada: { id: string } | null
  fila: Array<{ id: string; status: string; motivo: string | null; mensagem: MensagemHub }>
}
const rotulo: Record<string, string> = {
  enviado: 'Aceito pelo provedor',
  incerto: 'Entrega a conferir',
  falhou: 'Falhou',
  adiado: 'Adiado',
  pendente: 'Na fila',
  processando: 'Processando',
  pulado: 'Pulado',
}
export function HistoricoRodadas() {
  const [dados, setDados] = useState<Dados | null>(null),
    [erro, setErro] = useState(''),
    [selecionada, setSelecionada] = useState(''),
    [aberta, setAberta] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    void chamarFuncao<Dados>('hub-emails', { acao: 'estado', ...(selecionada ? { rodada: selecionada } : {}) })
      .then((d) => {
        if (ativo) {
          setDados(d)
          setErro('')
        }
      })
      .catch((e) => {
        if (ativo) setErro(String(e))
      })
    return () => {
      ativo = false
    }
  }, [selecionada])
  return (
    <Painel
      titulo="Rodadas diárias"
      descricao="As últimas 14 rodadas: o que você autorizou, quem ficou de fora e o resultado de cada mensagem."
    >
      {erro ? (
        <Faixa tom="erro">{erro}</Faixa>
      ) : !dados ? (
        <Carregando linhas={3} />
      ) : !dados.rodadas.length ? (
        <p className="a3-mudo">Nenhuma rodada iniciada. Os envios anteriores continuam no registro abaixo.</p>
      ) : (
        <div className="a3-pilha">
          <label className="a3-campo">
            <span>Rodada</span>
            <select
              className="a3-entrada"
              value={selecionada || dados.rodada?.id || ''}
              onChange={(e) => {
                setSelecionada(e.target.value)
                setAberta(null)
              }}
            >
              <option value="" disabled>
                Escolher rodada
              </option>
              {dados.rodadas.map((r) => (
                <option key={r.id} value={r.id}>
                  {diaDaSerie(r.dia, true)} · {r.status} · iniciada {dataHora(r.criado_em)}
                </option>
              ))}
            </select>
          </label>
          {!dados.rodada && <p className="a3-mudo">Escolha uma rodada anterior.</p>}
          {!!dados.rodadas.find((r) => r.id === dados.rodada?.id)?.resumo?.excluidas?.length && (
            <details>
              <summary>Contatos excluídos na preparação</summary>
              {dados.rodadas
                .find((r) => r.id === dados.rodada?.id)!
                .resumo!.excluidas!.map((e, i) => (
                  <p className="a3-pequeno" key={i}>
                    {e.nome} · {e.motivo}
                  </p>
                ))}
            </details>
          )}
          {dados.fila.map((f) => (
            <div key={f.id} style={{ borderTop: '1px solid var(--a3-linha)', paddingTop: 16 }}>
              <button
                type="button"
                className="a3-botao a3-botao--fantasma"
                aria-expanded={aberta === f.id}
                onClick={() => setAberta(aberta === f.id ? null : f.id)}
              >
                {f.mensagem.nome} · {rotulo[f.status] ?? f.status}
              </button>
              <p className="a3-pequeno a3-mudo">
                {f.mensagem.assunto}
                {f.motivo ? ` · ${f.motivo}` : ''}
              </p>
              {aberta === f.id && <PreviaCarta assunto={f.mensagem.assunto} corpo={f.mensagem.corpo} descadastro />}
            </div>
          ))}
        </div>
      )}
    </Painel>
  )
}
