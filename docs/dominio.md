# Ligar o ortoquestoes.com.br ao site

Passo a passo do que fazer no registro.br e no GitHub. A ordem importa: DNS
primeiro, GitHub depois. Ao contrário, o GitHub recusa o domínio porque ainda
não consegue verificá-lo.

O código já está pronto para os dois endereços — o build usa caminho relativo,
então o mesmo arquivo publicado funciona em `talesrobertosn.github.io/ortoquestoes/`
e em `ortoquestoes.com.br/`, sem precisar reconstruir nada na troca.

## 1. Registro.br — apontar o DNS

Entre em <https://registro.br>, faça login, abra **Painel → Meus domínios →
ortoquestoes.com.br** e clique em **DNS → Editar zona**. Se o domínio estiver
usando os servidores DNS do próprio registro.br (o padrão de quem acabou de
comprar), é essa a tela certa.

Crie **cinco** registros. Os quatro primeiros são os endereços do GitHub Pages;
o quinto faz o `www` funcionar.

| Nome (host) | Tipo | Dados (valor) |
|---|---|---|
| *(vazio ou `@`)* | A | `185.199.108.153` |
| *(vazio ou `@`)* | A | `185.199.109.153` |
| *(vazio ou `@`)* | A | `185.199.110.153` |
| *(vazio ou `@`)* | A | `185.199.111.153` |
| `www` | CNAME | `talesrobertosn.github.io.` |

Detalhes que costumam travar:

- No registro.br o campo de nome fica **vazio** para o domínio raiz. Não escreva
  `ortoquestoes.com.br` ali — o sistema completa sozinho e o registro sai
  duplicado (`ortoquestoes.com.br.ortoquestoes.com.br`).
- O CNAME termina com **ponto final**: `talesrobertosn.github.io.` O ponto diz
  que o nome é absoluto.
- São **quatro** registros A, um para cada endereço. Todos com o mesmo nome.
- Se o painel oferecer registros AAAA (IPv6), pode acrescentar os do GitHub, mas
  não é necessário.
- TTL: pode deixar o padrão.

Salve. A propagação costuma levar de alguns minutos a algumas horas.

Para conferir do terminal, quando quiser:

```
dig +short ortoquestoes.com.br
dig +short www.ortoquestoes.com.br
```

O primeiro precisa devolver os quatro endereços `185.199.*`; o segundo, o
`talesrobertosn.github.io`.

## 2. GitHub — registrar o domínio

Com o DNS já respondendo, vá em **github.com/talesrobertosn/ortoquestoes →
Settings → Pages**:

1. Em **Custom domain**, escreva `ortoquestoes.com.br` e clique em **Save**.
   O GitHub faz a verificação na hora; se reclamar, é porque o DNS ainda não
   propagou — espere e tente de novo.
2. Espere o certificado. Aparece um aviso de *"Certificate being provisioned"*
   por alguns minutos até algumas horas.
3. Quando o aviso sumir, marque **Enforce HTTPS**. Só depois de o certificado
   sair — marcar antes deixa o site inacessível até ele ficar pronto.

O arquivo `public/CNAME` já está no repositório com o domínio dentro, então a
configuração sobrevive a cada publicação.

## 3. Conferir

- `https://ortoquestoes.com.br` abre o site.
- `https://www.ortoquestoes.com.br` redireciona para ele.
- `https://talesrobertosn.github.io/ortoquestoes/` passa a redirecionar para o
  domínio novo.
- O cadeado aparece na barra do navegador.

## Perguntas que aparecem depois

**E-mail no domínio?** Nada aqui interfere nisso. Os registros MX são
independentes dos A e do CNAME, e podem ser adicionados na mesma zona quando
você quiser um `contato@ortoquestoes.com.br`.

**O `www` é obrigatório?** Não. Ele existe para quem digita por hábito, e o
GitHub redireciona automaticamente para a versão sem `www`.

**Trocar de hospedagem depois?** Basta mudar os quatro registros A. O código não
depende do endereço.
