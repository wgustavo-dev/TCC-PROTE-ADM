import { AppDataSource } from "../config/database";
import { Condutor } from "../models/model_condutor";
import { Monitor } from "../models/model_monitor";
import bcrypt from "bcryptjs";

type TipoAcesso = "condutor" | "monitor";

interface UsuarioLogado {
  id: number;
  email: string;
  role: "CONDUTOR" | "MONITOR";
}

export class ServiceAcessos {
  private condutorRepository = AppDataSource.getRepository(Condutor);
  private monitorRepository = AppDataSource.getRepository(Monitor);

  // Normaliza e valida o parâmetro ":tipo" recebido nas rotas
  // PUT/DELETE /acessos/:tipo/:id.
  private normalizarTipo(tipo: string): TipoAcesso {
    const tipoNormalizado = String(tipo || "").trim().toLowerCase();

    if (tipoNormalizado !== "condutor" && tipoNormalizado !== "monitor") {
      throw new Error("Tipo de acesso inválido. Utilize 'condutor' ou 'monitor'.");
    }

    return tipoNormalizado as TipoAcesso;
  }

  // O e-mail é o campo usado no login (service_auth busca em ambas as
  // tabelas por e-mail), então precisa ser único entre condutor E
  // monitor, não só dentro da própria tabela.
  private async validarEmailDisponivel(
    email: string,
    ignorar?: { tipo: TipoAcesso; id: number }
  ) {
    const condutorExistente = await this.condutorRepository.findOneBy({ email });
    if (
      condutorExistente &&
      !(ignorar?.tipo === "condutor" && ignorar.id === condutorExistente.id_condutor)
    ) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    const monitorExistente = await this.monitorRepository.findOneBy({ email });
    if (
      monitorExistente &&
      !(ignorar?.tipo === "monitor" && ignorar.id === monitorExistente.id_monitor)
    ) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }
  }

  private formatarCondutor(condutor: Condutor) {
    return {
      id: condutor.id_condutor,
      tipo: "condutor" as TipoAcesso,
      acesso: "Condutor",
      nome: condutor.nome,
      email: condutor.email,
      telefone: condutor.telefone,
    };
  }

  private formatarMonitor(monitor: Monitor) {
    return {
      id: monitor.id_monitor,
      tipo: "monitor" as TipoAcesso,
      acesso: "Monitor",
      nome: monitor.nome,
      email: monitor.email,
      telefone: monitor.telefone,
      id_condutor: monitor.id_condutor,
    };
  }

  // GET /acessos -> lista condutores e monitores ativos em uma única lista
  async listar() {
    const [condutores, monitores] = await Promise.all([
      this.condutorRepository.find({
        where: { ativo: true },
        order: { nome: "ASC" },
      }),
      this.monitorRepository.find({
        where: { ativo: true },
        order: { nome: "ASC" },
      }),
    ]);

    const lista = [
      ...condutores.map((condutor) => this.formatarCondutor(condutor)),
      ...monitores.map((monitor) => this.formatarMonitor(monitor)),
    ];

    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  // POST /acessos -> cria condutor ou monitor, dependendo do campo "acesso"
  async criar(dados: any, usuarioLogado: UsuarioLogado) {
    const tipo = this.normalizarTipo(dados.acesso);

    if (!dados.nome?.trim()) {
      throw new Error("Nome é obrigatório.");
    }

    if (!dados.email?.trim()) {
      throw new Error("E-mail é obrigatório.");
    }

    if (!dados.telefone?.trim()) {
      throw new Error("Telefone é obrigatório.");
    }

    if (!dados.senha || dados.senha.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres.");
    }

    const email = dados.email.trim().toLowerCase();
    await this.validarEmailDisponivel(email);

    const senhaCriptografada = await bcrypt.hash(dados.senha, 10);

    if (tipo === "condutor") {
      const condutor = this.condutorRepository.create({
        nome: dados.nome.trim(),
        email,
        telefone: dados.telefone.trim(),
        senha: senhaCriptografada,
        ativo: true,
      });

      await this.condutorRepository.save(condutor);

      return this.formatarCondutor(condutor);
    }

    // tipo === "monitor"
    // Regra de negócio: o frontend NUNCA escolhe o condutor. A FK é
    // sempre obtida a partir do condutor autenticado (req.user), já
    // que só um condutor tem permissão para chegar até aqui
    // (roleMiddleware(["CONDUTOR"]) na rota).
    const condutorLogado = await this.condutorRepository.findOneBy({
      id_condutor: usuarioLogado.id,
      ativo: true,
    });

    if (!condutorLogado) {
      throw new Error("Condutor autenticado não encontrado.");
    }

    const monitor = this.monitorRepository.create({
      nome: dados.nome.trim(),
      email,
      telefone: dados.telefone.trim(),
      senha: senhaCriptografada,
      id_condutor: condutorLogado.id_condutor,
      ativo: true,
    });

    await this.monitorRepository.save(monitor);

    return this.formatarMonitor(monitor);
  }

  // PUT /acessos/:tipo/:id -> edita condutor ou monitor
  async atualizar(tipoParam: string, id: number, dados: any) {
    const tipo = this.normalizarTipo(tipoParam);

    if (tipo === "condutor") {
      const condutor = await this.condutorRepository.findOneBy({ id_condutor: id });

      if (!condutor || !condutor.ativo) {
        throw new Error("Condutor não encontrado.");
      }

      if (dados.nome !== undefined) {
        if (!dados.nome.trim()) throw new Error("Nome é obrigatório.");
        condutor.nome = dados.nome.trim();
      }

      if (dados.email !== undefined) {
        const email = String(dados.email).trim().toLowerCase();
        if (!email) throw new Error("E-mail é obrigatório.");
        await this.validarEmailDisponivel(email, { tipo: "condutor", id });
        condutor.email = email;
      }

      if (dados.telefone !== undefined) {
        if (!String(dados.telefone).trim()) throw new Error("Telefone é obrigatório.");
        condutor.telefone = dados.telefone.trim();
      }

      if (dados.senha) {
        if (dados.senha.length < 6) {
          throw new Error("A senha deve ter no mínimo 6 caracteres.");
        }
        condutor.senha = await bcrypt.hash(dados.senha, 10);
      }

      await this.condutorRepository.save(condutor);

      return this.formatarCondutor(condutor);
    }

    // tipo === "monitor"
    const monitor = await this.monitorRepository.findOneBy({ id_monitor: id });

    if (!monitor || !monitor.ativo) {
      throw new Error("Monitor não encontrado.");
    }

    if (dados.nome !== undefined) {
      if (!dados.nome.trim()) throw new Error("Nome é obrigatório.");
      monitor.nome = dados.nome.trim();
    }

    if (dados.email !== undefined) {
      const email = String(dados.email).trim().toLowerCase();
      if (!email) throw new Error("E-mail é obrigatório.");
      await this.validarEmailDisponivel(email, { tipo: "monitor", id });
      monitor.email = email;
    }

    if (dados.telefone !== undefined) {
      if (!String(dados.telefone).trim()) throw new Error("Telefone é obrigatório.");
      monitor.telefone = dados.telefone.trim();
    }

    if (dados.senha) {
      if (dados.senha.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }
      monitor.senha = await bcrypt.hash(dados.senha, 10);
    }

    // O vínculo id_condutor é definido apenas na criação (a partir do
    // req.user). A edição não permite trocar o condutor responsável.

    await this.monitorRepository.save(monitor);

    return this.formatarMonitor(monitor);
  }

  // DELETE /acessos/:tipo/:id -> exclusão lógica (ativo = false)
  async deletar(tipoParam: string, id: number) {
    const tipo = this.normalizarTipo(tipoParam);

    if (tipo === "condutor") {
      const condutor = await this.condutorRepository.findOneBy({ id_condutor: id });

      if (!condutor || !condutor.ativo) {
        throw new Error("Condutor não encontrado.");
      }

      condutor.ativo = false;
      await this.condutorRepository.save(condutor);

      return { message: "Condutor desativado com sucesso." };
    }

    const monitor = await this.monitorRepository.findOneBy({ id_monitor: id });

    if (!monitor || !monitor.ativo) {
      throw new Error("Monitor não encontrado.");
    }

    monitor.ativo = false;
    await this.monitorRepository.save(monitor);

    return { message: "Monitor desativado com sucesso." };
  }
}
