import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminLink, AdminUser } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <h1>Admin · Gestão do encurtador</h1>
        <button (click)="logout()">Sair</button>
      </div>

      <section class="card" style="margin-bottom: 16px">
        <h2>Novo usuário do encurtador</h2>
        <form [formGroup]="form" (ngSubmit)="create()" class="row">
          <input formControlName="nome" placeholder="Nome" />
          <input formControlName="email" placeholder="Email" type="email" />
          <input formControlName="senha" placeholder="Senha" type="password" />
          <button [disabled]="form.invalid || loading">Cadastrar</button>
        </form>
      </section>

      <section class="card" style="margin-bottom: 16px">
        <h2>Usuários cadastrados</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.nome }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.ativo === false ? 'Inativo' : 'Ativo' }}</td>
              <td>{{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <button
                  [disabled]="deletingUserId === user._id || user.role === 'admin'"
                  (click)="confirmDeleteUser(user)"
                >
                  {{ deletingUserId === user._id ? 'Processando...' : 'Excluir/Inativar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <h2 style="margin: 0">Todos os links</h2>
          <span style="color: #4b5563; font-size: 0.9em">{{ links.length }} link(s)</span>
        </div>
        <p *ngIf="loadingLinks" style="color: #4b5563">Carregando...</p>
        <table *ngIf="!loadingLinks">
          <thead>
            <tr>
              <th>Slug</th>
              <th>URL de destino</th>
              <th>Usuário</th>
              <th>Cliques</th>
              <th>Rev.</th>
              <th>Criado em</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let link of links">
              <td><strong>{{ link.slug }}</strong></td>
              <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                  [title]="link.urlDestino">{{ link.urlDestino }}</td>
              <td>{{ link.usuario?.email || '—' }}</td>
              <td>{{ link.cliques }}</td>
              <td>{{ link.revisaoAtual }}</td>
              <td>{{ link.dataCriacao | date: 'dd/MM/yyyy' }}</td>
              <td>
                <button
                  style="background: #dc2626; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer"
                  [disabled]="deletingId === link._id"
                  (click)="confirmDelete(link)"
                >{{ deletingId === link._id ? 'Excluindo...' : 'Apagar' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="error" *ngIf="error">{{ error }}</p>
      <p style="color: #065f46; margin-top: 8px" *ngIf="info">{{ info }}</p>

      <!-- Modal de confirmação de exclusão -->
      <div
        *ngIf="linkParaExcluir"
        style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center"
        (click)="linkParaExcluir = null"
      >
        <div
          class="card"
          style="width:100%;max-width:420px;margin:0 16px"
          (click)="$event.stopPropagation()"
        >
          <h2 style="margin-top:0;color:#dc2626">Confirmar exclusão</h2>
          <p>Tem certeza que deseja apagar o link <strong>/{{ linkParaExcluir.slug }}</strong>?</p>
          <p style="color:#4b5563;font-size:.9em;margin-top:0">
            URL: {{ linkParaExcluir.urlDestino }}<br>
            Cliques que serão apagados: <strong>{{ linkParaExcluir.cliques }}</strong>
          </p>
          <p style="color:#dc2626;font-size:.85em;margin-top:0">Esta ação não pode ser desfeita.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button (click)="linkParaExcluir = null">Cancelar</button>
            <button
              style="background:#dc2626;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer"
              (click)="deleteLink()"
            >Confirmar exclusão</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  users: AdminUser[] = [];
  links: AdminLink[] = [];
  loading = false;
  loadingLinks = false;
  deletingId: string | null = null;
  deletingUserId: string | null = null;
  linkParaExcluir: AdminLink | null = null;
  info = '';
  error = '';

  form = this.fb.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadLinks();
  }

  create(): void {
    if (this.form.invalid) {
      return;
    }

    const { nome, email, senha } = this.form.getRawValue();
    this.loading = true;
    this.info = '';
    this.error = '';

    this.adminService.createUser(nome!, email!, senha!).subscribe({
      next: () => {
        this.form.reset();
        this.loadUsers();
      },
      error: () => {
        this.error = 'Erro ao cadastrar usuário.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.adminService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: () => {
        this.error = 'Erro ao carregar usuários.';
      }
    });
  }

  confirmDeleteUser(user: AdminUser): void {
    if (!user._id) {
      return;
    }

    if (user.role === 'admin') {
      this.error = 'Usuário admin não pode ser excluído/inativado.';
      return;
    }

    const confirmado = window.confirm(
      `Confirma a exclusão do usuário ${user.email}?\nSe ele possuir URLs cadastradas, será apenas inativado.`
    );

    if (!confirmado) {
      return;
    }

    this.deletingUserId = user._id;
    this.error = '';
    this.info = '';

    this.adminService.deleteOrInactivateUser(user._id).subscribe({
      next: (result) => {
        this.info = result.message;
        this.loadUsers();
        this.deletingUserId = null;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erro ao processar usuário.';
        this.deletingUserId = null;
      }
    });
  }

  loadLinks(): void {
    this.loadingLinks = true;
    this.adminService.listLinks().subscribe({
      next: (links) => {
        this.links = links;
        this.loadingLinks = false;
      },
      error: () => {
        this.error = 'Erro ao carregar links.';
        this.loadingLinks = false;
      }
    });
  }

  confirmDelete(link: AdminLink): void {
    this.linkParaExcluir = link;
  }

  deleteLink(): void {
    if (!this.linkParaExcluir) {
      return;
    }
    const id = this.linkParaExcluir._id;
    this.deletingId = id;
    this.linkParaExcluir = null;

    this.adminService.deleteLink(id).subscribe({
      next: () => {
        this.links = this.links.filter((l) => l._id !== id);
        this.deletingId = null;
      },
      error: () => {
        this.error = 'Erro ao excluir link.';
        this.deletingId = null;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
