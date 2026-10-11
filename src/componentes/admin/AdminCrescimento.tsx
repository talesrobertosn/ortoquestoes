import { AdminLembretes } from './AdminLembretes'
import { useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { BarrasHorizontais, GraficoColunas, type Ponto } from './AdminGraficos'
import { erroDoPainel, porcentagem } from './formatos'
import { AdminPerfis } from './AdminPerfis'
import type { LinhaUsuario } from './AdminUsuarios'
import { AdminRitmo } from './AdminRitmo'
import type { AssinaturaBase } from './receita'

interface Dia { dia: string; cadastros: number; ativos: number; respostas: number }
interface Funil { cadastrados: number; confirmaram: number; responderam: number; passaram_50: number; passaram_500: number; assinaram: number }
interface Coorte { semana: string; cadastros: number; estudaram_1a_semana: number; voltaram_2a_semana: number }

const MIGRACAO = '202609290200_painel_admin_2.sql'
const dataCurta = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

export function AdminCrescimento({ usuarios, assinaturas }: { usuarios: LinhaUsuario[] | null; assinaturas: AssinaturaBase[] }) {
  const [dias, definirDias] = useState(30)
  const [serie, definirSerie] = useState<Dia[] | null>(null)
  const [funil, definirFunil] = useState<Funil | null>(null)
  const [coortes, definirCoortes] = useState<Coorte[] | null>(null)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    let vivo = true
    definirSerie(null)
    chamarRpc<Dia[]>('serie_diaria_admin', { p_dias: dias }).then(d => { if (vivo) definirSerie(d) }).catch(f => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [dias])
  useEffect(() => {
    let vivo = true
    Promise.all([chamarRpc<Funil[]>('funil_admin', {}), chamarRpc<Coorte[]>('retencao_admin', {})])
      .then(([f, c]) => { if (vivo) { definirFunil(f[0] ?? null); definirCoortes(c) } })
      .catch(f => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [])

  const pontos = useMemo(() => {
    const mapa = (campo: keyof Omit<Dia, 'dia'>): Ponto[] => (serie ?? []).map(d => ({ rotulo: dataLonga(d.dia), rotuloCurto: dataCurta(d.dia), valor: Number(d[campo]) }))
    return { cadastros: mapa('cadastros'), ativos: mapa('ativos'), respostas: mapa('respostas') }
  }, [serie])

  if (erro) return <section className="adm-secao"><p role="alert" className="adm-alerta">{erro}</p></section>

  return <div className="empilha-2">
    <AdminLembretes />
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-dia">
      <div className="adm-secao__cabeca">
        <div><h2 id="adm-titulo-dia">Dia a dia</h2><p>Cada gráfico tem a sua escala. A data de uma resposta é a do aparelho de quem respondeu.</p></div>
        <div className="adm-filtros" role="group" aria-label="Período">
          {[30, 90].map(v => <button key={v} type="button" className="adm-chip" aria-pressed={dias === v} onClick={() => definirDias(v)}>{v} dias</button>)}
        </div>
      </div>
      {!serie ? <p role="status">Carregando…</p> : <div className="adm-graficos">
        <GraficoColunas titulo="Questões respondidas" pontos={pontos.respostas} unidade="questões" />
        <GraficoColunas titulo="Pessoas que estudaram" subtitulo="ao menos 1 questão no dia" pontos={pontos.ativos} unidade="pessoas" />
        <GraficoColunas titulo="Cadastros novos" pontos={pontos.cadastros} unidade="cadastros" />
      </div>}
    </section>

    {usuarios ? <AdminRitmo usuarios={usuarios} assinaturas={assinaturas} /> : <section className="adm-secao"><p className="adm-vazio">Carregando cadastros e assinaturas…</p></section>}

    <div className="adm-duas">
      <section className="empilha adm-secao" aria-labelledby="adm-titulo-funil">
        <div><h2 id="adm-titulo-funil">Funil</h2><p>De quem se cadastrou, quantos avançaram em cada etapa. A etapa com a maior queda é onde agir.</p></div>
        {!funil ? <p role="status">Carregando…</p> : <BarrasHorizontais maximo={funil.cadastrados || 1} itens={[
          { rotulo: 'Cadastraram', valor: funil.cadastrados },
          { rotulo: 'Confirmaram o e-mail', valor: funil.confirmaram, detalhe: `${porcentagem(funil.confirmaram, funil.cadastrados) ?? 0}% dos cadastros` },
          { rotulo: 'Responderam a 1ª questão', valor: funil.responderam, detalhe: `${porcentagem(funil.responderam, funil.confirmaram) ?? 0}% de quem confirmou` },
          { rotulo: 'Passaram de 50 questões', valor: funil.passaram_50, detalhe: `${porcentagem(funil.passaram_50, funil.responderam) ?? 0}% de quem começou` },
          { rotulo: 'Passaram de 500 questões', valor: funil.passaram_500, detalhe: `${porcentagem(funil.passaram_500, funil.passaram_50) ?? 0}% de quem passou de 50` },
          { rotulo: 'Assinaram', valor: funil.assinaram, detalhe: `${porcentagem(funil.assinaram, funil.responderam) ?? 0}% de quem estudou` },
        ]} />}
      </section>

      <section className="empilha adm-secao" aria-labelledby="adm-titulo-retencao">
        <div><h2 id="adm-titulo-retencao">Retenção</h2><p>Por semana de cadastro: quem estudou na 1ª semana e quem voltou na 2ª.</p></div>
        {!coortes ? <p role="status">Carregando…</p> : coortes.length === 0 ? <p className="adm-vazio">Ainda não há semanas completas para comparar.</p> :
          <div className="adm-tabela-rolagem" role="region" aria-label="Retenção por semana" tabIndex={0}><table className="tabela adm-retencao">
            <thead><tr><th scope="col">Semana</th><th scope="col">Cadastros</th><th scope="col">Estudaram na 1ª</th><th scope="col">Voltaram na 2ª</th></tr></thead>
            <tbody>{coortes.map(c => {
              const estudou = porcentagem(Number(c.estudaram_1a_semana), Number(c.cadastros)) ?? 0
              const voltou = porcentagem(Number(c.voltaram_2a_semana), Number(c.cadastros)) ?? 0
              return <tr key={c.semana}>
                <td>{dataCurta(c.semana)}</td><td className="numerico">{c.cadastros}</td>
                <td><span className="adm-celula" style={{ '--p': `${estudou}%` } as React.CSSProperties}>{estudou}%</span></td>
                <td><span className="adm-celula" style={{ '--p': `${voltou}%` } as React.CSSProperties}>{voltou}%</span></td>
              </tr>
            })}</tbody>
          </table></div>}
      </section>
    </div>

    {usuarios ? <AdminPerfis usuarios={usuarios} /> : <section className="adm-secao"><p className="adm-vazio">Carregando os perfis…</p></section>}

  </div>
}
