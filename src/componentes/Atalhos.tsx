const LISTA: Array<[string, string]> = [
  ['1 … 5', 'Selecionar a alternativa'],
  ['Enter', 'Confirmar a resposta, e depois avançar'],
  ['→ ou N', 'Próxima questão'],
  ['← ou P', 'Questão anterior'],
  ['M', 'Abrir o mapa de questões'],
  ['F', 'Favoritar a questão'],
  ['R', 'Marcar para revisão'],
  ['E', 'Esconder ou mostrar as etiquetas de assunto'],
  ['Shift + 1 … 5', 'Riscar uma alternativa'],
  ['?', 'Mostrar estes atalhos'],
]

export function Atalhos() {
  return (
    <div className="atalhos">
      {LISTA.map(([tecla, o_que]) => (
        <div className="atalhos__linha" key={tecla}>
          <kbd>{tecla}</kbd>
          <span>{o_que}</span>
        </div>
      ))}
    </div>
  )
}
