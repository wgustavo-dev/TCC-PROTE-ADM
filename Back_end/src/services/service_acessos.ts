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
  // PUT/DELETE /acessos/:tipo/:id, e também o campo "acesso" enviado
  // no corpo da requisição (usado para decidir a entidade no POST e,
  // agora, o tipo de destino no PUT).
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

  // PUT /acessos/:tipo/:id -> edita condutor ou monitor.
  //
  // NOVA REGRA DE NEGÓCIO: se o campo "acesso" enviado no corpo
  // representar um tipo DIFERENTE do ":tipo" da URL (ex: URL diz
  // "condutor", mas o corpo manda acesso: "Monitor"), significa que o
  // usuário quer TROCAR o nível de acesso. Como as duas entidades são
  // tabelas independentes, essa troca não pode ser um simples UPDATE:
  // ela é feita através do método converterTipo(), que desativa o
  // registro de origem e cria um novo na tabela de destino,
  // preservando os dados (nome, e-mail, telefone e senha).
  async atualizar(tipoParam: string, id: number, dados: any, usuarioLogado: UsuarioLogado) {
    const tipoOrigem = this.normalizarTipo(tipoParam);
    const tipoDestino = dados.acesso ? this.normalizarTipo(dados.acesso) : tipoOrigem;

    if (tipoDestino !== tipoOrigem) {
      return this.converterTipo(tipoOrigem, id, tipoDestino, dados, usuarioLogado);
    }

    if (tipoOrigem === "condutor") {
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

    // tipoOrigem === "monitor"
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
    // req.user). A edição comum (sem troca de tipo) não permite
    // trocar o condutor responsável.

    await this.monitorRepository.save(monitor);

    return this.formatarMonitor(monitor);
  }

  // Troca o nível de acesso de um usuário (Condutor <-> Monitor).
  //
  // Como condutor e monitor são tabelas independentes (sem herança),
  // não existe um "UPDATE" que mude um registro de uma tabela para a
  // outra. Dentro do modelo de exclusão lógica já adotado no sistema,
  // existem dois cenários possíveis:
  //
  //   A) Já existe um registro (ativo ou não) com esse e-mail na
  //      tabela de DESTINO — geralmente porque essa mesma pessoa já
  //      foi convertida antes (ex: Condutor -> Monitor -> Condutor).
  //      Nesse caso, o sistema REATIVA esse registro antigo (mantendo
  //      os dados que já estavam salvos nele) em vez de criar um novo,
  //      e desativa o registro de origem.
  //
  //   B) Não existe nenhum registro com esse e-mail na tabela de
  //      destino. Nesse caso, cria-se um novo registro (copiando
  //      nome/e-mail/telefone/senha do registro de origem) e desativa
  //      o registro de origem — comportamento igual ao de antes.
  //
  // Em ambos os casos, o registro de origem nunca é apagado — apenas
  // desativado —, preservando o histórico.
  private async converterTipo(
    tipoOrigem: TipoAcesso,
    idOrigem: number,
    tipoDestino: TipoAcesso,
    dados: any,
    usuarioLogado: UsuarioLogado
  ) {
    if (tipoOrigem === "condutor") {
      const condutorOrigem = await this.condutorRepository.findOneBy({ id_condutor: idOrigem });

      if (!condutorOrigem || !condutorOrigem.ativo) {
        throw new Error("Condutor não encontrado.");
      }

      // Segurança: o sistema não pode ficar sem nenhum condutor ativo,
      // pois só um condutor tem permissão para acessar o módulo de
      // Controle de Acessos. Convertendo o último, ninguém mais
      // conseguiria gerenciar usuários.
      const totalCondutoresAtivos = await this.condutorRepository.count({
        where: { ativo: true },
      });

      if (totalCondutoresAtivos <= 1) {
        throw new Error(
          "Não é possível converter o único condutor ativo do sistema em monitor."
        );
      }

      const emailDestino =
        dados.email !== undefined ? String(dados.email).trim().toLowerCase() : condutorOrigem.email;
      if (!emailDestino) throw new Error("E-mail é obrigatório.");

      // Cenário A: já existe um monitor (ativo ou inativo) com esse
      // e-mail — provavelmente de uma conversão anterior. Reativa o
      // registro existente, mantendo os dados que já estavam salvos
      // nele (não sobrescreve nome/telefone/senha com os valores
      // enviados agora).
      const monitorExistente = await this.monitorRepository.findOneBy({ email: emailDestino });

      if (monitorExistente) {
        monitorExistente.ativo = true;
        await this.monitorRepository.save(monitorExistente);

        condutorOrigem.ativo = false;
        await this.condutorRepository.save(condutorOrigem);

        return this.formatarMonitor(monitorExistente);
      }

      // Cenário B: não existe registro anterior — cria um novo.
      const nome = dados.nome !== undefined ? String(dados.nome).trim() : condutorOrigem.nome;
      if (!nome) throw new Error("Nome é obrigatório.");

      const telefone =
        dados.telefone !== undefined ? String(dados.telefone).trim() : condutorOrigem.telefone;
      if (!telefone) throw new Error("Telefone é obrigatório.");

      if (dados.senha && dados.senha.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }

      // Ignora o próprio registro de origem na checagem de e-mail,
      // já que ele está prestes a ser desativado e o e-mail será
      // reaproveitado no novo registro.
      await this.validarEmailDisponivel(emailDestino, { tipo: "condutor", id: idOrigem });

      // Mantém a senha atual (hash) se nenhuma nova foi informada.
      const senha = dados.senha
        ? await bcrypt.hash(dados.senha, 10)
        : condutorOrigem.senha;

      // Regra de negócio já usada na criação: todo monitor pertence ao
      // condutor autenticado que está realizando a operação.
      const condutorResponsavel = await this.condutorRepository.findOneBy({
        id_condutor: usuarioLogado.id,
        ativo: true,
      });

      if (!condutorResponsavel) {
        throw new Error("Condutor autenticado não encontrado.");
      }

      const novoMonitor = this.monitorRepository.create({
        nome,
        email: emailDestino,
        telefone,
        senha,
        id_condutor: condutorResponsavel.id_condutor,
        ativo: true,
      });

      await this.monitorRepository.save(novoMonitor);

      condutorOrigem.ativo = false;
      await this.condutorRepository.save(condutorOrigem);

      return this.formatarMonitor(novoMonitor);
    }

    // tipoOrigem === "monitor" -> tipoDestino === "condutor"
    const monitorOrigem = await this.monitorRepository.findOneBy({ id_monitor: idOrigem });

    if (!monitorOrigem || !monitorOrigem.ativo) {
      throw new Error("Monitor não encontrado.");
    }

    const emailDestino =
      dados.email !== undefined ? String(dados.email).trim().toLowerCase() : monitorOrigem.email;
    if (!emailDestino) throw new Error("E-mail é obrigatório.");

    // Cenário A: já existe um condutor (ativo ou inativo) com esse
    // e-mail — reativa mantendo os dados que já estavam salvos nele.
    const condutorExistente = await this.condutorRepository.findOneBy({ email: emailDestino });

    if (condutorExistente) {
      condutorExistente.ativo = true;
      await this.condutorRepository.save(condutorExistente);

      monitorOrigem.ativo = false;
      await this.monitorRepository.save(monitorOrigem);

      return this.formatarCondutor(condutorExistente);
    }

    // Cenário B: não existe registro anterior — cria um novo.
    const nome = dados.nome !== undefined ? String(dados.nome).trim() : monitorOrigem.nome;
    if (!nome) throw new Error("Nome é obrigatório.");

    const telefone =
      dados.telefone !== undefined ? String(dados.telefone).trim() : monitorOrigem.telefone;
    if (!telefone) throw new Error("Telefone é obrigatório.");

    if (dados.senha && dados.senha.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres.");
    }

    await this.validarEmailDisponivel(emailDestino, { tipo: "monitor", id: idOrigem });

    const senha = dados.senha
      ? await bcrypt.hash(dados.senha, 10)
      : monitorOrigem.senha;

    const novoCondutor = this.condutorRepository.create({
      nome,
      email: emailDestino,
      telefone,
      senha,
      ativo: true,
    });

    await this.condutorRepository.save(novoCondutor);

    monitorOrigem.ativo = false;
    await this.monitorRepository.save(monitorOrigem);

    return this.formatarCondutor(novoCondutor);
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
