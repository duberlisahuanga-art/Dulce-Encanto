<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $token)
    {
        // Se ejecuta después de enviar la respuesta HTTP: el tiempo o un fallo
        // del proveedor de correo no revela si la cuenta existe.
        $this->onConnection('deferred');
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:4200')), '/');
        $email = method_exists($notifiable, 'getEmailForPasswordReset')
            ? $notifiable->getEmailForPasswordReset()
            : $notifiable->email;

        $url = "{$frontendUrl}/recuperar-contrasena?token={$this->token}&email=".urlencode((string) $email);

        return (new MailMessage)
            ->subject('Recuperación de contraseña - '.config('app.name'))
            ->greeting('¡Hola!')
            ->line('Recibiste este correo porque se solicitó un restablecimiento de contraseña para tu cuenta en Dulce Encanto.')
            ->action('Restablecer contraseña', $url)
            ->line('Este enlace de recuperación expirará en 60 minutos.')
            ->line('Si no solicitaste este cambio, no necesitas realizar ninguna acción.')
            ->salutation('Atentamente, el equipo de '.config('app.name'));
    }
}
