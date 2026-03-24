<?php

namespace App\Providers;

use App\Events\WhatsApp\WhatsAppMessageStored;
use App\Listeners\WhatsApp\WhatsAppMessageStoredListener;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Increase payload limits for WhatsApp media/document uploads (base64 payloads are larger than the original file).
        ini_set('post_max_size', (string) env('WHATSAPP_POST_MAX_SIZE', '64M'));
        ini_set('upload_max_filesize', (string) env('WHATSAPP_UPLOAD_MAX_FILESIZE', '64M'));
        ini_set('memory_limit', (string) env('WHATSAPP_MEMORY_LIMIT', '256M'));

        Event::listen(WhatsAppMessageStored::class, WhatsAppMessageStoredListener::class);
    }
}
