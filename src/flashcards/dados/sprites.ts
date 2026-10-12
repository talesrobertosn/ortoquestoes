/** Sprites em pixel art (um caractere por pixel; '.' é transparente). Sem anatomia e sem caveira. */
export const SPRITES: Record<string, string[]> = {
  brasao: [".kkkkkkkkk.", "kooooooooook", "kogggggggok", "kogwwgwwgok", "koggwwwggok", "kogggwgggok", "kogggwgggok", ".kogggggok.", "..kogggok..", "...kooook..", "....kook...", ".....kk...."],
  coracao: [".kkk...kkk.", "krrrk.krrrk", "krwrrkrrrrk", "krrrrrrrrrk", "krrrrrrrrrk", ".krrrrrrrk.", "..krrrrrk..", "...krrrk...", "....krk....", ".....k....."],
  escudo: ["kkkkkkkk", "kbbbbbbk", "kbwbbbbk", "kbbbbbbk", "kbbbbbbk", ".kbbbbk.", "..kbbk..", "...kk..."],
  pocao: ["..kkk...", "...k....", "..kgk...", ".kgggk..", "kgwgggk.", "kgggggk.", "kgggggk.", ".kkkkk.."],
  coroa: ["k..k..k.", "ko.ko.ko", "kookookk", "koooooko", "korooook", "koooooko", "kkkkkkkk", "........"],
  pergaminho: ["kkkkkkk.", "kyyyyyyk", ".kyyyyk.", ".kyrryk.", ".kyyyyk.", ".kyyyyk.", "kyyyyyyk", "kkkkkkk."],
  espada: ["......kk", ".....kwk", "....kwk.", ".k.kwk..", ".kkwk...", "..kk....", ".k.kk...", "k...k..."],
  golem: [".....kkkkkk.....", "....kwwwwwwk....", "...kwwswwswwk...", "...kwkrwwkrwk...", "...kwwwwwwwwk...", "...kwwkkkkwwk...", "....kwwwwwwk....", "..kkkwwwwwwkkk..", ".kwwwkwwswwkwwk.", ".kwswkwwwwwkwsk.", ".kwwwkwswwwkwwk.", ".kwwkkwwwwwkkwk.", "..kk.kwwwwwk.k..", ".....kwkkkwk....", "....kwwk.kwwk...", "....kkkk.kkkk..."],
  serpente: ["................", ".......kkkk.....", "......kyyyyk....", ".....kyrykyyk...", ".....kyyyyyyk...", "......kyyyykr...", ".......kyyk..r..", "......kydk......", ".....kydk.......", "....kydk..kkk...", "....kydk.kyyyk..", "....kyddkydkyk..", ".....kyyyydk.k..", "......kkkkk....."],
  guardiao: [".......kk.......", "......krrk......", "......krrk......", "....kkkkkkkk....", "...koooooooook..", "..koooooooooook.", "..kokkkkkkkkok..", "..kok.r..r.kok..", "..kokkkkkkkkok..", "..koookkkkoook..", "..koookkkkoook..", "...kooookooook..", "....koooooook...", ".....kkkkkkk...."],
  heroi: ["......kkk.......", ".....kbbbk......", "......kbbk......", "....kkkkkkkk....", "...kssssssssk...", "..kssssssssssk..", "..kskkkkkkkksk..", "..ksk.w..w.ksk..", "..kskkkkkkkksk..", "..ksssskkssssk..", "..ksssskkssssk..", "...ksssssssk....", "....kkkkkkk....."],
  // Relíquias
  bisturi: ["......kk", ".....kwk", "....kwsk", "...kwsk.", "..kksk..", ".kook...", "kook....", "kk......"],
  tala: ["kkkkkkkk", "kwwwwwwk", "kwskkswk", "kwwwwwwk", "kwskkswk", "kwwwwwwk", "kwskkswk", "kkkkkkkk"],
  amuleto: ["..k..k..", "...kk...", "..kook..", ".koyyok.", "koyrryok", ".koyyok.", "..kook..", "...kk..."],
  lupa: [".kkkk...", "kbwbbk..", "kwbbbk..", "kbbbbk..", ".kkkkk..", "....kok.", ".....kok", "......kk"],
}

/** Paleta dos sprites: k contorno, o ouro, g vinho, w osso-claro, r vermelho, b azul, y amarelo, d ouro escuro, s aço. */
export const PALETA: Record<string, string> = {
  k: '#120a06', o: '#e3b04b', g: '#7a2a1c', w: '#ece6d8', r: '#d9452b', b: '#4f8fd6', y: '#d9b44a', d: '#8a6a1f', s: '#9aa6b5',
}
