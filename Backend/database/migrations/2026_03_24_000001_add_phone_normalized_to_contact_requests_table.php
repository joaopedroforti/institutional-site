<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('contact_requests', 'phone_normalized')) {
                $table->string('phone_normalized', 25)->nullable()->after('phone')->index();
            }
        });

        DB::table('contact_requests')->select(['id', 'phone'])->orderBy('id')->chunkById(500, function ($rows): void {
            foreach ($rows as $row) {
                $digits = preg_replace('/\D+/', '', (string) ($row->phone ?? ''));
                if ($digits === '') {
                    continue;
                }

                if (strlen($digits) > 11 && str_starts_with($digits, '55')) {
                    $digits = substr($digits, -11);
                }

                DB::table('contact_requests')
                    ->where('id', $row->id)
                    ->update(['phone_normalized' => $digits]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('contact_requests', function (Blueprint $table): void {
            if (Schema::hasColumn('contact_requests', 'phone_normalized')) {
                $table->dropIndex(['phone_normalized']);
                $table->dropColumn('phone_normalized');
            }
        });
    }
};
