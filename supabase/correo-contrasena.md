# Correo de "¿Olvidaste tu contraseña?" en español

Va en **Supabase → Authentication → Emails → Reset Password**. Se pega el
asunto en *Subject heading* y el bloque de abajo en *Message body*.

`{{ .ConfirmationURL }}` es el enlace con el token: lo pone Supabase y no se
toca. El resto es texto normal y se puede cambiar cuando haga falta.

## Asunto

```
Cambiá tu contraseña · Constructor de Planos
```

## Cuerpo

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #d8dfe9;border-radius:12px;overflow:hidden">
        <tr>
          <td style="background:#15274b;padding:22px 28px">
            <div style="color:#8ab6f0;font-size:11px;letter-spacing:2px;text-transform:uppercase">Grupo Modumex</div>
            <div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:4px">Constructor de Planos</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px">
            <h2 style="margin:0 0 12px;font-size:18px;color:#16203a">Cambiá tu contraseña</h2>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44506a">
              Pediste volver a entrar al Constructor de Planos y no te acordás de tu contraseña.
              Tocá el botón y poné una nueva.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 20px">
              <tr>
                <td style="background:#15274b;border-radius:8px">
                  <a href="{{ .ConfirmationURL }}"
                     style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">
                    Poner una contraseña nueva
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#6b7a88">
              El enlace vence en una hora y sirve una sola vez.
            </p>
            <p style="margin:0 0 6px;font-size:12px;color:#6b7a88">Si el botón no abre, copiá esta dirección:</p>
            <p style="margin:0 0 22px;font-size:12px;word-break:break-all">
              <a href="{{ .ConfirmationURL }}" style="color:#35538c">{{ .ConfirmationURL }}</a>
            </p>
            <p style="margin:0;padding-top:18px;border-top:1px solid #e3e8ef;font-size:12px;line-height:1.6;color:#6b7a88">
              Si no fuiste vos, no hagás nada: tu contraseña sigue siendo la misma.
              La contraseña se cambia desde la web; con esa misma entrás también a la
              aplicación de escritorio.
            </p>
          </td>
        </tr>
      </table>
      <div style="max-width:520px;margin-top:14px;font-size:11px;color:#8a95a6">
        Grupo Modumex · Mamparas sanitarias
      </div>
    </td>
  </tr>
</table>
```

## Después de pegarlo

Mandarse un correo a uno mismo desde **¿Olvidaste tu contraseña?** y revisar que
el botón lleve a `modumex.github.io/constructor-planos`. Si el enlace apunta a
otro lado, falta la dirección en **Authentication → URL Configuration →
Redirect URLs**.
