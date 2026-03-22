<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class LeadKanbanColumn extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'color',
        'position',
        'is_default',
        'is_locked',
    ];

    public function contacts(): HasMany
    {
        return $this->hasMany(ContactRequest::class)->orderBy('lead_order')->orderBy('created_at');
    }

    public static function seedDefaults(): void
    {
        $hasIsLockedColumn = Schema::hasColumn('lead_kanban_columns', 'is_locked');

        $defaults = [
            ['name' => 'Lead', 'slug' => 'lead', 'color' => '#5b6ef1', 'position' => 0, 'is_default' => true, 'is_locked' => true],
            ['name' => 'Em conversa', 'slug' => 'em-conversa', 'color' => '#52b4ff', 'position' => 1, 'is_default' => false, 'is_locked' => false],
            ['name' => 'Onboarding', 'slug' => 'onboarding', 'color' => '#8a7dff', 'position' => 2, 'is_default' => false, 'is_locked' => false],
            ['name' => 'Orcamento', 'slug' => 'orcamento', 'color' => '#ffb347', 'position' => 3, 'is_default' => false, 'is_locked' => false],
            ['name' => 'Aprovado', 'slug' => 'aprovado', 'color' => '#39c98d', 'position' => 4, 'is_default' => false, 'is_locked' => true],
            ['name' => 'Reprovado', 'slug' => 'reprovado', 'color' => '#ff7f8a', 'position' => 5, 'is_default' => false, 'is_locked' => true],
        ];

        foreach ($defaults as $column) {
            if (! $hasIsLockedColumn) {
                unset($column['is_locked']);
            }

            static::query()->updateOrCreate(
                ['slug' => $column['slug']],
                $column,
            );
        }
    }

    public static function defaultColumn(): self
    {
        static::seedDefaults();

        return static::query()
            ->orderByDesc('is_default')
            ->orderBy('position')
            ->firstOrFail();
    }

    public static function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug !== '' ? $baseSlug : 'coluna';
        $suffix = 1;

        while (
            static::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
