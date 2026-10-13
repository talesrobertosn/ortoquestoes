/**
 * Folhas de animação assadas pelo motor de volume (scripts/sprites/).
 * Gerado por scripts/sprites/indice.py: não edite à mão.
 */
export interface AnimAssada { linha: number; quadros: number; ms: number }
export interface MetaAssada { largura: number; altura: number; colunas: number; ancora: [number, number]; caixa: [number, number, number, number]; animacoes: Record<string, AnimAssada> }
export const ASSADOS: Record<string, MetaAssada> = {
 "dragao": {
  "largura": 264,
  "altura": 216,
  "colunas": 6,
  "ancora": [
   150,
   206
  ],
  "caixa": [
   16,
   55,
   221,
   158
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
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   20,
   6,
   50,
   87
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
    "ms": 90
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
 "heroi-2": {
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   18,
   6,
   52,
   87
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
    "ms": 90
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
 "heroi-3": {
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   18,
   6,
   52,
   87
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
    "ms": 90
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
 "heroi-4": {
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   18,
   6,
   52,
   87
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
    "ms": 90
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
 "heroi-5": {
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   18,
   6,
   53,
   87
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
    "ms": 90
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
 "heroi-6": {
  "largura": 96,
  "altura": 96,
  "colunas": 6,
  "ancora": [
   46,
   90
  ],
  "caixa": [
   13,
   5,
   58,
   88
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
    "ms": 90
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
