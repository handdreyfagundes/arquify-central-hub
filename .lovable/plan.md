

## Plan: Ativar auto-confirm de e-mail

Uma unica alteracao: usar a ferramenta `cloud--configure_auth` para ativar o auto-confirm de e-mail, permitindo que novos cadastros sejam confirmados automaticamente sem verificacao por e-mail.

### Alteracao

- Configurar `double_confirm_email_addresses` = false e `enable_signup` = true via ferramenta de configuracao de auth

Nenhum arquivo precisa ser modificado.

