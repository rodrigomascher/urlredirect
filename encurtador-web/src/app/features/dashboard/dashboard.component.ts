import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Chart, CategoryScale, LinearScale, BarController, BarElement, Legend, Tooltip } from 'chart.js';
import QRCode from 'qrcode';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LinkService } from '../../core/services/link.service';
import {
  ClickByDay,
  ComparisonMetrics,
  CliquesPorCidade,
  CliquesPorDispositivo,
  CliquesPorHora,
  CliquesPorOrigem,
  CliquesPorPais,
  CliquesPorPlataforma,
  Link,
  LinkRevisao,
  LinkRevisoes,
  RefererTop,
  SegmentationMetrics
} from '../../shared/models/link.model';
import { environment } from '../../../environments/environment';

Chart.register(CategoryScale, LinearScale, BarController, BarElement, Legend, Tooltip);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <h1>Dashboard de Links</h1>
        <div style="display: flex; gap: 8px">
          <button (click)="openChangePassword()">Alterar senha</button>
          <button (click)="logout()">Sair</button>
        </div>
      </div>

      <section class="card" style="margin-bottom: 16px">
        <div style="display: flex; gap: 8px; flex-wrap: wrap">
          <button
            type="button"
            (click)="setActiveSection('links')"
            [style.background]="activeSection === 'links' ? '#1d4ed8' : '#f1f5f9'"
            [style.color]="activeSection === 'links' ? '#ffffff' : '#1f2937'"
            [style.border]="activeSection === 'links' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'"
            style="padding: 8px 14px; border-radius: 8px; cursor: pointer"
          >Gestão de links</button>
          <button
            type="button"
            (click)="setActiveSection('metrics')"
            [style.background]="activeSection === 'metrics' ? '#1d4ed8' : '#f1f5f9'"
            [style.color]="activeSection === 'metrics' ? '#ffffff' : '#1f2937'"
            [style.border]="activeSection === 'metrics' ? '1px solid #1d4ed8' : '1px solid #cbd5e1'"
            style="padding: 8px 14px; border-radius: 8px; cursor: pointer"
          >Métricas e segmentação</button>
        </div>
      </section>

      <ng-container *ngIf="activeSection === 'links'">
        <section class="card" style="margin-bottom: 16px">
          <h2>Criar link</h2>
          <form [formGroup]="createForm" (ngSubmit)="createLink()" class="row">
            <input formControlName="slug" placeholder="slug (ex: promocao-abril)" />
            <input formControlName="urlDestino" placeholder="https://destino.com" />
            <button [disabled]="createForm.invalid">Criar</button>
          </form>
        </section>

        <section class="card" style="margin-bottom: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
            <h2 style="margin: 0">Links cadastrados</h2>
            <span style="color: #4b5563; font-size: 0.9em">{{ filteredLinks.length }} resultado(s)</span>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 12px 0">
            <input
              [value]="linksSearch"
              (input)="onLinksSearch($event)"
              placeholder="Buscar por slug ou URL de destino"
              style="min-width: 260px"
            />

            <label for="linksPageSize">Itens por página:</label>
            <select
              id="linksPageSize"
              [value]="linksPageSize"
              (change)="onLinksPageSizeChange($event)"
              style="padding: 8px; border: 1px solid #bfc7d8; border-radius: 6px"
            >
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>

          <table *ngIf="paginatedLinks.length > 0; else noLinksState">
            <thead>
              <tr>
                <th>Slug</th>
                <th>URL de destino</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let link of paginatedLinks">
                <td>{{ link.slug }}</td>
                <td>
                  <input
                    [value]="editValues[link._id] || link.urlDestino"
                    (input)="onEditValue(link._id, $event)"
                  />
                </td>
                <td>
                  <button (click)="save(link)" [disabled]="saveStatus[link._id] === 'saving'">Salvar destino</button>
                  <span
                    *ngIf="saveStatus[link._id] === 'saving'"
                    style="margin-left: 8px; color: #6b7280; font-size: 0.85em"
                  >Salvando...</span>
                  <span
                    *ngIf="saveStatus[link._id] === 'saved'"
                    style="margin-left: 8px; color: #16a34a; font-size: 0.85em"
                  >&#10003; Salvo!</span>
                  <span
                    *ngIf="saveStatus[link._id] === 'error'"
                    style="margin-left: 8px; color: #dc2626; font-size: 0.85em"
                  >&#10005; Erro ao salvar</span>
                  <button style="margin-left: 8px" (click)="generateQr(link)">QR Code</button>
                  <button style="margin-left: 8px" (click)="viewRevisions(link)">
                    Revisões {{ link.revisaoAtual && link.revisaoAtual > 1 ? '(' + link.revisaoAtual + ')' : '' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #noLinksState>
            <p style="margin: 10px 0 0; color: #4b5563">
              Nenhum link encontrado{{ linksSearch ? ' para o filtro aplicado' : '' }}.
            </p>
          </ng-template>

          <div
            *ngIf="totalLinksPages > 1"
            style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 12px"
          >
            <button type="button" (click)="goToPreviousLinksPage()" [disabled]="linksPage <= 1">Anterior</button>
            <span style="font-size: 0.9em; color: #4b5563">Página {{ linksPage }} de {{ totalLinksPages }}</span>
            <button type="button" (click)="goToNextLinksPage()" [disabled]="linksPage >= totalLinksPages">Próxima</button>
          </div>
        </section>

        <section class="card" style="margin-bottom: 16px" *ngIf="selectedRevisions">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h2 style="margin: 0">Histórico de revisões — {{ selectedRevisions.slug }}</h2>
            <button (click)="selectedRevisions = null">Fechar</button>
          </div>
          <p style="margin: 4px 0 12px; color: #4b5563">URL atual: {{ selectedRevisions.urlDestino }}</p>
          <p *ngIf="loadingRevisions" style="color: #4b5563">Carregando...</p>
          <table *ngIf="!loadingRevisions">
            <thead>
              <tr>
                <th>Revisão</th>
                <th>URL de destino</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Cliques</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of selectedRevisions.revisoes">
                <td>Rev. {{ r.revisao }}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                    [title]="r.urlDestino">{{ r.urlDestino }}</td>
                <td>{{ r.inicioEm | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ r.fimEm ? (r.fimEm | date:'dd/MM/yyyy HH:mm') : 'atual' }}</td>
                <td>{{ r.cliques }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="card" style="margin-bottom: 16px" *ngIf="selectedQrDataUrl">
          <h2>QR Code do slug</h2>
          <p style="margin-top: 0">{{ selectedShortUrl }}</p>
          <img [src]="selectedQrDataUrl" alt="QR Code da URL curta" width="220" height="220" />
          <div style="margin-top: 12px">
            <button (click)="downloadQrPng()">Baixar QR (PNG)</button>
          </div>
        </section>
      </ng-container>

      <ng-container *ngIf="activeSection === 'metrics'">
        <section class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
            <h2 style="margin: 0">Cliques por dia (últimos {{ segmentationSelectedDays }} dias)</h2>
            <div style="display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap">
              <label for="slugFiltro" style="margin-top: 8px">Slugs:</label>
              <select
                id="slugFiltro"
                multiple
                (change)="onMetricsSlugsChange($event)"
                size="6"
                style="padding: 8px; border: 1px solid #bfc7d8; border-radius: 6px; min-width: 240px"
              >
                <option *ngFor="let link of links" [value]="link._id" [selected]="selectedMetricsLinkIds.includes(link._id)">
                  {{ link.slug }}
                </option>
              </select>
              <button
                type="button"
                (click)="clearMetricsSlugSelection()"
                [disabled]="selectedMetricsLinkIds.length === 0 || loadingMetrics || loadingSegmentation"
                style="margin-top: 2px"
              >Limpar</button>
            </div>
          </div>
          <p style="margin: 6px 0 10px; color: #6b7280">Use Cmd/Ctrl para selecionar múltiplos slugs (máximo de 10).</p>
          <p style="margin: 6px 0 10px; color: #4b5563" *ngIf="selectedMetricsSlugLabel">
            Indicadores filtrados por slug(s): <strong>{{ selectedMetricsSlugLabel }}</strong>
          </p>
          <p *ngIf="!loadingMetrics && !metricsHasData" style="margin: 6px 0 10px; color: #4b5563">
            Nenhum clique encontrado no período{{ selectedMetricsSlugLabel ? ' para os slugs selecionados' : '' }}.
          </p>
          <div style="position: relative; width: 100%; height: 260px; max-height: 260px; overflow: hidden">
            <canvas #chartCanvas></canvas>
          </div>
        </section>

        <section class="card" style="margin-top: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap">
            <h2 style="margin: 0">Segmentação de cliques (últimos {{ segmentationPeriodoDias }} dias)</h2>
            <div style="display: flex; align-items: center; gap: 8px">
              <label for="periodo">Período:</label>
              <select
                id="periodo"
                [value]="segmentationSelectedDays"
                (change)="onSegmentationPeriodChange($event)"
                [disabled]="loadingMetrics || loadingSegmentation"
                style="padding: 8px; border: 1px solid #bfc7d8; border-radius: 6px"
              >
                <option [value]="7">7 dias</option>
                <option [value]="15">15 dias</option>
                <option [value]="30">30 dias</option>
              </select>
            </div>
          </div>
          <p *ngIf="loadingMetrics || loadingSegmentation" style="margin: 8px 0 0; color: #4b5563">
            Atualizando métricas...
          </p>
          <p style="margin-top: 0">Total: {{ segmentationTotalCliques }}</p>

          <div *ngIf="segmentationComparativoLinks.length > 1" style="margin-bottom: 16px">
            <h3>Comparativo por slug</h3>
            <table>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Cliques</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of segmentationComparativoLinks">
                  <td>{{ item.slug }}</td>
                  <td>{{ item.totalCliques }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <div>
              <h3>Dispositivo</h3>
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationDispositivos">
                    <td>{{ item.dispositivo }}</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Origem</h3>
              <table>
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationOrigens">
                    <td>{{ item.origem }}</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Plataforma (Android/iPhone)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Plataforma</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationPlataformas">
                    <td>{{ item.plataforma }}</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Países (top 10)</h3>
              <table>
                <thead>
                  <tr>
                    <th>País</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationPaises">
                    <td>{{ item.pais }}</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Cidades (top 10)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Cidade</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationCidades">
                    <td>{{ item.cidade }}</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Hora de acesso</h3>
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationHoras">
                    <td>{{ item.hora }}h</td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3>Referers (top 10)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Referer</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of segmentationReferers">
                    <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                      {{ item.referer }}
                    </td>
                    <td>{{ item.cliques }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </ng-container>

      <p class="error" *ngIf="error">{{ error }}</p>

      <!-- Modal: Alterar senha -->
      <div
        *ngIf="showChangePassword"
        style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center"
        (click)="closeChangePassword()"
      >
        <div
          class="card"
          style="width:100%;max-width:400px;margin:0 16px;position:relative"
          (click)="$event.stopPropagation()"
        >
          <h2 style="margin-top:0">Alterar senha</h2>
          <form [formGroup]="changePasswordForm" (ngSubmit)="submitChangePassword()">
            <div style="display:flex;flex-direction:column;gap:10px">
              <input
                type="password"
                formControlName="senhaAtual"
                placeholder="Senha atual"
                autocomplete="current-password"
              />
              <input
                type="password"
                formControlName="novaSenha"
                placeholder="Nova senha (mín. 6 caracteres)"
                autocomplete="new-password"
              />
              <input
                type="password"
                formControlName="confirmarSenha"
                placeholder="Confirmar nova senha"
                autocomplete="new-password"
              />
              <p
                *ngIf="changePasswordForm.errors?.['senhasNaoConferem'] && changePasswordForm.get('confirmarSenha')?.dirty"
                style="color:#dc2626;margin:0;font-size:.85em"
              >As senhas não conferem.</p>
              <p *ngIf="changePasswordFeedback" [style.color]="changePasswordStatus === 'error' ? '#dc2626' : '#16a34a'" style="margin:0;font-size:.9em">{{ changePasswordFeedback }}</p>
              <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
                <button type="button" (click)="closeChangePassword()">Cancelar</button>
                <button
                  type="submit"
                  [disabled]="changePasswordForm.invalid || changePasswordStatus === 'saving'"
                >{{ changePasswordStatus === 'saving' ? 'Salvando...' : 'Confirmar' }}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly linkService = inject(LinkService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly metricsFilterTrigger$ = new Subject<void>();

  activeSection: 'links' | 'metrics' = 'links';
  links: Link[] = [];
  linksSearch = '';
  linksPage = 1;
  linksPageSize = 10;
  editValues: Record<string, string> = {};
  chart?: Chart;
  lastMetricsItems: ClickByDay[] | ComparisonMetrics = [];
  selectedQrDataUrl = '';
  selectedShortUrl = '';
  selectedSlug = '';
  selectedRevisions: LinkRevisoes | null = null;
  loadingRevisions = false;
  saveStatus: Record<string, 'saving' | 'saved' | 'error'> = {};
  selectedMetricsLinkIds: string[] = [];
  metricsHasData = true;
  segmentationPeriodoDias = 7;
  segmentationSelectedDays = 7;
  segmentationTotalCliques = 0;
  segmentationDispositivos: CliquesPorDispositivo[] = [];
  segmentationPlataformas: CliquesPorPlataforma[] = [];
  segmentationOrigens: CliquesPorOrigem[] = [];
  segmentationPaises: CliquesPorPais[] = [];
  segmentationCidades: CliquesPorCidade[] = [];
  segmentationHoras: CliquesPorHora[] = [];
  segmentationReferers: RefererTop[] = [];
  segmentationComparativoLinks: Array<{ linkId: string; slug: string; totalCliques: number }> = [];
  loadingMetrics = false;
  loadingSegmentation = false;
  error = '';
  showChangePassword = false;
  changePasswordStatus: '' | 'saving' | 'saved' | 'error' = '';
  changePasswordFeedback = '';

  createForm = this.fb.group({
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,40}$/)]],
    urlDestino: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
  });

  changePasswordForm = this.fb.group(
    {
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', Validators.required]
    },
    {
      validators: (group) => {
        const nova = group.get('novaSenha')?.value;
        const confirmar = group.get('confirmarSenha')?.value;
        return nova && confirmar && nova !== confirmar ? { senhasNaoConferem: true } : null;
      }
    }
  );

  ngAfterViewInit(): void {
    this.metricsFilterTrigger$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => {
      this.loadMetrics();
      this.loadSegmentation();
    });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const section = this.parseSectionFromRoute(params.get('section'));

      if (!section) {
        void this.router.navigate(['/dashboard/links'], { replaceUrl: true });
        return;
      }

      const changed = this.activeSection !== section;
      this.activeSection = section;

      if (section === 'metrics' && changed) {
        setTimeout(() => {
          const hasCachedMetrics = Array.isArray(this.lastMetricsItems)
            ? this.lastMetricsItems.length > 0
            : this.lastMetricsItems.labels.length > 0;

          if (hasCachedMetrics) {
            this.renderChart(this.lastMetricsItems);
          }
        }, 0);

        if (this.links.length > 0) {
          this.loadMetrics();
          this.loadSegmentation();
        }
      }
    });

    this.loadLinks();
  }

  setActiveSection(section: 'links' | 'metrics'): void {
    if (this.activeSection === section) {
      return;
    }

    const routeSection = section === 'metrics' ? 'metricas' : 'links';
    void this.router.navigate(['/dashboard', routeSection]);
  }

  private parseSectionFromRoute(section: string | null): 'links' | 'metrics' | null {
    if (section === 'links') {
      return 'links';
    }

    if (section === 'metricas') {
      return 'metrics';
    }

    return null;
  }

  onLinksSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.linksSearch = target.value;
    this.linksPage = 1;
  }

  onLinksPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const pageSize = Number(target.value);
    this.linksPageSize = [10, 25, 50].includes(pageSize) ? pageSize : 10;
    this.linksPage = 1;
  }

  goToPreviousLinksPage(): void {
    if (this.linksPage > 1) {
      this.linksPage -= 1;
    }
  }

  goToNextLinksPage(): void {
    if (this.linksPage < this.totalLinksPages) {
      this.linksPage += 1;
    }
  }

  get filteredLinks(): Link[] {
    const term = this.linksSearch.trim().toLowerCase();
    if (!term) {
      return this.links;
    }

    return this.links.filter((link) => {
      return link.slug.toLowerCase().includes(term) || link.urlDestino.toLowerCase().includes(term);
    });
  }

  get totalLinksPages(): number {
    return Math.max(1, Math.ceil(this.filteredLinks.length / this.linksPageSize));
  }

  get paginatedLinks(): Link[] {
    const start = (this.linksPage - 1) * this.linksPageSize;
    return this.filteredLinks.slice(start, start + this.linksPageSize);
  }

  onEditValue(linkId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editValues[linkId] = target.value;
  }

  createLink(): void {
    if (this.createForm.invalid) {
      return;
    }

    const value = this.createForm.getRawValue();
    this.linkService
      .create(value.slug!.trim().toLowerCase(), value.urlDestino!.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.createForm.reset();
          this.loadLinks();
        },
        error: () => {
          this.error = 'Erro ao criar link.';
        }
      });
  }

  save(link: Link): void {
    const novoDestino = (this.editValues[link._id] ?? link.urlDestino).trim();
    this.saveStatus[link._id] = 'saving';
    this.linkService
      .updateDestino(link._id, novoDestino)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveStatus[link._id] = 'saved';
          this.loadLinks();
          setTimeout(() => { delete this.saveStatus[link._id]; }, 3000);
        },
        error: () => {
          this.saveStatus[link._id] = 'error';
          setTimeout(() => { delete this.saveStatus[link._id]; }, 4000);
        }
      });
  }

  viewRevisions(link: Link): void {
    if (this.selectedRevisions?.slug === link.slug) {
      this.selectedRevisions = null;
      return;
    }
    this.loadingRevisions = true;
    this.selectedRevisions = null;
    this.linkService
      .getRevisions(link._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: LinkRevisoes) => {
          this.selectedRevisions = data;
          this.loadingRevisions = false;
        },
        error: () => {
          this.error = 'Erro ao carregar revisões.';
          this.loadingRevisions = false;
        }
      });
  }

  generateQr(link: Link): void {
    const shortUrl = `${environment.shortBaseUrl}/${link.slug}`;

    QRCode.toDataURL(shortUrl, { width: 220, margin: 1 })
      .then((dataUrl: string) => {
        this.selectedQrDataUrl = dataUrl;
        this.selectedShortUrl = shortUrl;
        this.selectedSlug = link.slug;
        this.error = '';
      })
      .catch(() => {
        this.error = 'Erro ao gerar QR Code.';
      });
  }

  downloadQrPng(): void {
    if (!this.selectedQrDataUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = this.selectedQrDataUrl;
    anchor.download = `qrcode-${this.selectedSlug || 'slug'}.png`;
    anchor.click();
  }

  openChangePassword(): void {
    this.changePasswordForm.reset();
    this.changePasswordStatus = '';
    this.changePasswordFeedback = '';
    this.showChangePassword = true;
  }

  closeChangePassword(): void {
    this.showChangePassword = false;
  }

  submitChangePassword(): void {
    if (this.changePasswordForm.invalid || this.changePasswordStatus === 'saving') {
      return;
    }
    const { senhaAtual, novaSenha } = this.changePasswordForm.getRawValue();
    this.changePasswordStatus = 'saving';
    this.changePasswordFeedback = '';
    this.authService
      .changePassword(senhaAtual!, novaSenha!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.changePasswordStatus = 'saved';
          this.changePasswordFeedback = 'Senha alterada com sucesso!';
          setTimeout(() => this.closeChangePassword(), 1800);
        },
        error: (err) => {
          this.changePasswordStatus = 'error';
          this.changePasswordFeedback = err?.error?.message || 'Erro ao alterar senha.';
        }
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadLinks(): void {
    this.linkService
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (links) => {
          this.links = links;

          if (this.linksPage > this.totalLinksPages) {
            this.linksPage = this.totalLinksPages;
          }

          this.selectedMetricsLinkIds = this.selectedMetricsLinkIds.filter((selectedId) =>
            this.links.some((link) => link._id === selectedId)
          );

          if (this.selectedMetricsLinkIds.length > 10) {
            this.selectedMetricsLinkIds = this.selectedMetricsLinkIds.slice(0, 10);
          }

          this.loadMetrics();
          this.loadSegmentation();

          this.error = '';
        },
        error: () => {
          this.error = 'Erro ao carregar links.';
        }
      });
  }

  private loadMetrics(): void {
    this.loadingMetrics = true;
    this.linkService
      .getLast7DaysMetrics(this.segmentationSelectedDays, this.selectedMetricsLinkIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.lastMetricsItems = response;

          if (Array.isArray(response)) {
            this.metricsHasData = response.some((item) => item.cliques > 0);
          } else {
            this.metricsHasData = response.totalCliques > 0;
          }

          this.renderChart(response);
          this.loadingMetrics = false;
        },
        error: () => {
          this.metricsHasData = false;
          this.lastMetricsItems = [];
          this.error = 'Erro ao carregar métricas.';
          this.loadingMetrics = false;
        }
      });
  }

  private loadSegmentation(): void {
    this.loadingSegmentation = true;
    this.linkService
      .getSegmentationMetrics(this.segmentationSelectedDays, this.selectedMetricsLinkIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics: SegmentationMetrics) => {
          this.segmentationPeriodoDias = metrics.periodoDias;
          this.segmentationTotalCliques = metrics.totalCliques;
          this.segmentationDispositivos = metrics.dispositivos;
          this.segmentationPlataformas = metrics.plataformas;
          this.segmentationOrigens = metrics.origens;
          this.segmentationPaises = metrics.paises;
          this.segmentationCidades = metrics.cidades;
          this.segmentationHoras = metrics.horas;
          this.segmentationReferers = metrics.referers;
          this.segmentationComparativoLinks = metrics.comparativoLinks || [];
          this.loadingSegmentation = false;
        },
        error: () => {
          this.segmentationComparativoLinks = [];
          this.error = 'Erro ao carregar segmentação.';
          this.loadingSegmentation = false;
        }
      });
  }

  onSegmentationPeriodChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const days = Number(target.value);
    this.segmentationSelectedDays = [7, 15, 30].includes(days) ? days : 7;
    this.loadMetrics();
    this.loadSegmentation();
  }

  onMetricsSlugsChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedValues = Array.from(target.selectedOptions).map((option) => option.value).filter(Boolean);

    this.selectedMetricsLinkIds = selectedValues.slice(0, 10);
    this.metricsFilterTrigger$.next();
  }

  clearMetricsSlugSelection(): void {
    this.selectedMetricsLinkIds = [];
    this.metricsFilterTrigger$.next();
  }

  get selectedMetricsSlugLabel(): string {
    if (this.selectedMetricsLinkIds.length === 0) {
      return '';
    }

    const selectedSlugs = this.links
      .filter((link) => this.selectedMetricsLinkIds.includes(link._id))
      .map((link) => link.slug);

    if (selectedSlugs.length <= 3) {
      return selectedSlugs.join(', ');
    }

    return `${selectedSlugs.slice(0, 3).join(', ')} +${selectedSlugs.length - 3}`;
  }

  private getDatasetColors(index: number): { backgroundColor: string; borderColor: string } {
    const palette = [
      { backgroundColor: 'rgba(37, 99, 235, 0.5)', borderColor: 'rgba(37, 99, 235, 1)' },
      { backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)' },
      { backgroundColor: 'rgba(234, 88, 12, 0.5)', borderColor: 'rgba(234, 88, 12, 1)' },
      { backgroundColor: 'rgba(220, 38, 38, 0.5)', borderColor: 'rgba(220, 38, 38, 1)' },
      { backgroundColor: 'rgba(124, 58, 237, 0.5)', borderColor: 'rgba(124, 58, 237, 1)' },
      { backgroundColor: 'rgba(14, 116, 144, 0.5)', borderColor: 'rgba(14, 116, 144, 1)' },
      { backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 1)' },
      { backgroundColor: 'rgba(219, 39, 119, 0.5)', borderColor: 'rgba(219, 39, 119, 1)' },
      { backgroundColor: 'rgba(2, 132, 199, 0.5)', borderColor: 'rgba(2, 132, 199, 1)' },
      { backgroundColor: 'rgba(22, 163, 74, 0.5)', borderColor: 'rgba(22, 163, 74, 1)' }
    ];

    return palette[index % palette.length];
  }

  private renderChart(items: ClickByDay[] | ComparisonMetrics): void {
    if (!this.chartCanvas) {
      return;
    }

    this.chart?.destroy();

    if (Array.isArray(items)) {
      this.chart = new Chart(this.chartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: items.map((item) => item.dia),
          datasets: [
            {
              label: 'Cliques',
              data: items.map((item) => item.cliques),
              backgroundColor: 'rgba(37, 99, 235, 0.5)',
              borderColor: 'rgba(37, 99, 235, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });

      return;
    }

    const datasets = items.series.map((serie, index) => {
      const colors = this.getDatasetColors(index);

      return {
        label: serie.slug,
        data: serie.valores,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 1
      };
    });

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          x: { stacked: false },
          y: { stacked: false, beginAtZero: true }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chart?.destroy();
  }
}
