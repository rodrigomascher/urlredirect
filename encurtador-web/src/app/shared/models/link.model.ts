export interface Link {
  _id: string;
  slug: string;
  urlDestino: string;
  usuarioId: string;
  dataCriacao: string;
}

export interface ClickByDay {
  dia: string;
  cliques: number;
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
}
