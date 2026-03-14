export interface LinkRevisao {
  revisao: number;
  urlDestino: string;
  inicioEm: string;
  fimEm: string | null;
  cliques: number;
}

export interface LinkRevisoes {
  slug: string;
  urlDestino: string;
  revisaoAtual: number;
  revisoes: LinkRevisao[];
}

export interface Link {
  _id: string;
  slug: string;
  urlDestino: string;
  usuarioId: string;
  dataCriacao: string;
  revisaoAtual?: number;
  revisoes?: LinkRevisao[];
}

export interface ClickByDay {
  dia: string;
  cliques: number;
}

export interface ComparisonSerie {
  linkId: string;
  slug: string;
  valores: number[];
  totalCliques: number;
}

export interface ComparisonMetrics {
  periodoDias: number;
  labels: string[];
  totalCliques: number;
  totaisPorDia: ClickByDay[];
  series: ComparisonSerie[];
}

export interface CliquesPorDispositivo {
  dispositivo: string;
  cliques: number;
}

export interface CliquesPorPlataforma {
  plataforma: string;
  cliques: number;
}

export interface CliquesPorOrigem {
  origem: string;
  cliques: number;
}

export interface CliquesPorPais {
  pais: string;
  cliques: number;
}

export interface CliquesPorCidade {
  cidade: string;
  cliques: number;
}

export interface CliquesPorHora {
  hora: number;
  cliques: number;
}

export interface RefererTop {
  referer: string;
  cliques: number;
}

export interface SegmentationMetrics {
  periodoDias: number;
  totalCliques: number;
  dispositivos: CliquesPorDispositivo[];
  plataformas: CliquesPorPlataforma[];
  origens: CliquesPorOrigem[];
  paises: CliquesPorPais[];
  cidades: CliquesPorCidade[];
  horas: CliquesPorHora[];
  referers: RefererTop[];
  comparativoLinks?: Array<{ linkId: string; slug: string; totalCliques: number }>;
}
