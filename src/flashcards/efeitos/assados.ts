/**
 * Folhas de animação assadas pelo motor de volume (scripts/sprites/).
 * Gerado por scripts/sprites/indice.py: não edite à mão.
 */
export interface AnimAssada { linha: number; quadros: number; ms: number }
export interface MetaAssada { largura: number; altura: number; colunas: number; ancora: [number, number]; caixa: [number, number, number, number]; animacoes: Record<string, AnimAssada> }
export const ASSADOS: Record<string, MetaAssada> = {
 "cogumelo": {
  "largura": 156,
  "altura": 112,
  "colunas": 6,
  "ancora": [
   80,
   101
  ],
  "caixa": [
   56,
   52,
   48,
   51
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 170
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 140
   }
  }
 },
 "dragao": {
  "largura": 264,
  "altura": 216,
  "colunas": 6,
  "ancora": [
   150,
   206
  ],
  "caixa": [
   21,
   27,
   231,
   189
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 230
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 85
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 150
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "ent": {
  "largura": 222,
  "altura": 152,
  "colunas": 6,
  "ancora": [
   130,
   142
  ],
  "caixa": [
   56,
   31,
   149,
   115
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 300
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 95
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 150
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 170
   }
  }
 },
 "esqueleto": {
  "largura": 152,
  "altura": 116,
  "colunas": 6,
  "ancora": [
   76,
   101
  ],
  "caixa": [
   51,
   32,
   47,
   71
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "goblin": {
  "largura": 168,
  "altura": 116,
  "colunas": 6,
  "ancora": [
   88,
   101
  ],
  "caixa": [
   48,
   31,
   77,
   72
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 240
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "golem-cimento": {
  "largura": 128,
  "altura": 128,
  "colunas": 6,
  "ancora": [
   62,
   120
  ],
  "caixa": [
   21,
   36,
   89,
   86
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "golem-cristal": {
  "largura": 128,
  "altura": 128,
  "colunas": 6,
  "ancora": [
   62,
   120
  ],
  "caixa": [
   21,
   36,
   89,
   86
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "golem-obsidiana": {
  "largura": 128,
  "altura": 128,
  "colunas": 6,
  "ancora": [
   62,
   120
  ],
  "caixa": [
   21,
   36,
   89,
   86
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "golem-rubro": {
  "largura": 128,
  "altura": 128,
  "colunas": 6,
  "ancora": [
   62,
   120
  ],
  "caixa": [
   21,
   36,
   89,
   86
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "golem": {
  "largura": 128,
  "altura": 128,
  "colunas": 6,
  "ancora": [
   62,
   120
  ],
  "caixa": [
   21,
   36,
   89,
   86
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "gosma-acida": {
  "largura": 112,
  "altura": 104,
  "colunas": 6,
  "ancora": [
   54,
   96
  ],
  "caixa": [
   24,
   52,
   60,
   50
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 220
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 100
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 75
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 85
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "gosma-rainha": {
  "largura": 112,
  "altura": 104,
  "colunas": 6,
  "ancora": [
   54,
   96
  ],
  "caixa": [
   24,
   45,
   60,
   57
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 220
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 100
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 75
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 85
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "gosma": {
  "largura": 112,
  "altura": 104,
  "colunas": 6,
  "ancora": [
   54,
   96
  ],
  "caixa": [
   24,
   52,
   60,
   50
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 220
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 100
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 75
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 85
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "guardiao-prata": {
  "largura": 152,
  "altura": 160,
  "colunas": 6,
  "ancora": [
   72,
   152
  ],
  "caixa": [
   33,
   35,
   88,
   124
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 150
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "guardiao-real": {
  "largura": 152,
  "altura": 160,
  "colunas": 6,
  "ancora": [
   72,
   152
  ],
  "caixa": [
   33,
   35,
   88,
   124
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 150
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "guardiao": {
  "largura": 152,
  "altura": 160,
  "colunas": 6,
  "ancora": [
   72,
   152
  ],
  "caixa": [
   33,
   35,
   88,
   124
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 110
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 80
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 150
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-1": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   19,
   11,
   72,
   92
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-2": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   17,
   7,
   75,
   96
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-3": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   15,
   7,
   77,
   96
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-4": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   14,
   4,
   78,
   99
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-5": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   12,
   4,
   80,
   99
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "heroi-6": {
  "largura": 136,
  "altura": 108,
  "colunas": 6,
  "ancora": [
   60,
   101
  ],
  "caixa": [
   10,
   3,
   85,
   101
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 160
   }
  }
 },
 "mimico": {
  "largura": 176,
  "altura": 112,
  "colunas": 6,
  "ancora": [
   104,
   101
  ],
  "caixa": [
   78,
   54,
   59,
   50
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 260
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 95
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 130
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "serpente-eletrica": {
  "largura": 136,
  "altura": 120,
  "colunas": 6,
  "ancora": [
   60,
   112
  ],
  "caixa": [
   25,
   51,
   61,
   69
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 200
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 100
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 },
 "serpente": {
  "largura": 136,
  "altura": 120,
  "colunas": 6,
  "ancora": [
   60,
   112
  ],
  "caixa": [
   25,
   51,
   61,
   69
  ],
  "animacoes": {
   "parado": {
    "linha": 0,
    "quadros": 4,
    "ms": 200
   },
   "preparo": {
    "linha": 1,
    "quadros": 3,
    "ms": 100
   },
   "golpe": {
    "linha": 2,
    "quadros": 6,
    "ms": 70
   },
   "dano": {
    "linha": 3,
    "quadros": 3,
    "ms": 90
   },
   "derrota": {
    "linha": 4,
    "quadros": 5,
    "ms": 140
   },
   "vitoria": {
    "linha": 5,
    "quadros": 4,
    "ms": 150
   }
  }
 }
}
