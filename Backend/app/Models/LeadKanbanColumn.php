<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class LeadKanbanColumn extends Model
{
    public const PIPE_COMERCIAL = 'comercial';
    public const PIPE_DESENVOLVIMENTO = 'desenvolvimento';
    public const PIPE_FOLLOWUP = 'followup';
    public const PIPE_CS = 'cs';

    protected $fillable = [
        'name',
        'slug',
        'pipeline',
        'color',
        'position',
        'is_default',
        'is_initial',
        'is_locked',
    ];

    public function contacts(): HasMany
    {
        return $this->hasMany(ContactRequest::class)->orderBy('lead_order')->orderBy('created_at');
    }

    public static function availablePipelines(): array
    {
        return [
            ['key' => self::PIPE_COMERCIAL, 'label' => 'Comercial'],
            ['key' => self::PIPE_DESENVOLVIMENTO, 'label' => 'Desenvolvimento'],
            ['key' => self::PIPE_FOLLOWUP, 'label' => 'FollowUp'],
            ['key' => self::PIPE_CS, 'label' => 'CS'],
        ];
    }

    public static function seedDefaults(): void
    {
        static::seedPipelineDefaults(self::PIPE_COMERCIAL);
        static::seedPipelineDefaults(self::PIPE_DESENVOLVIMENTO);
        static::seedPipelineDefaults(self::PIPE_FOLLOWUP);
        static::seedPipelineDefaults(self::PIPE_CS);
    }

    public static function seedPipelineDefaults(string $pipeline): void
    {
        $hasIsLockedColumn = Schema::hasColumn('lead_kanban_columns', 'is_locked');
        $hasPipelineColumn = Schema::hasColumn('lead_kanban_columns', 'pipeline');
        $hasInitialColumn = Schema::hasColumn('lead_kanban_columns', 'is_initial');

        $defaults = match ($pipeline) {
            self::PIPE_COMERCIAL => [
                ['name' => 'Lead', 'slug' => 'lead', 'color' => '#4F7CFF', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['name' => 'Contato', 'slug' => 'contato', 'color' => '#52b4ff', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Onboarding', 'slug' => 'onboarding', 'color' => '#8a7dff', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => false],
                ['name' => 'Orcamento', 'slug' => 'orcamento', 'color' => '#ffb347', 'position' => 3, 'is_default' => false, 'is_initial' => false, 'is_locked' => false],
            ],
            self::PIPE_DESENVOLVIMENTO => [
                ['name' => 'Contrato', 'slug' => 'contrato', 'color' => '#4F7CFF', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['name' => 'Planejamento', 'slug' => 'planejamento', 'color' => '#6EA8FE', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Desenvolvimento', 'slug' => 'desenvolvimento', 'color' => '#7CC4FA', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Deploy', 'slug' => 'deploy', 'color' => '#9AD29A', 'position' => 3, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Entrega', 'slug' => 'entrega', 'color' => '#39c98d', 'position' => 4, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
            ],
            self::PIPE_FOLLOWUP => [
                ['name' => 'Em espera', 'slug' => 'em-espera', 'color' => '#93A4BD', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['name' => 'Recebendo', 'slug' => 'recebendo', 'color' => '#A7B4C7', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Descadastrado', 'slug' => 'descadastrado', 'color' => '#B8C2D1', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
            ],
            self::PIPE_CS => [
                ['name' => 'Projeto Entregue', 'slug' => 'projeto-entregue', 'color' => '#2FB188', 'position' => 0, 'is_default' => true, 'is_initial' => true, 'is_locked' => true],
                ['name' => 'Em acompanhamento', 'slug' => 'em-acompanhamento', 'color' => '#5AC8A6', 'position' => 1, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
                ['name' => 'Projeto finalizado', 'slug' => 'projeto-finalizado', 'color' => '#70D5B7', 'position' => 2, 'is_default' => false, 'is_initial' => false, 'is_locked' => true],
            ],
            default => [],
        };

        foreach ($defaults as $column) {
            if (! $hasIsLockedColumn) {
                unset($column['is_locked']);
            }

            if (! $hasInitialColumn) {
                unset($column['is_initial']);
            }

            $where = ['slug' => $column['slug']];
            if ($hasPipelineColumn) {
                $column['pipeline'] = $pipeline;
                $where['pipeline'] = $pipeline;
            }

            static::query()->updateOrCreate($where, $column);
        }
    }

    public static function defaultColumn(string $pipeline = self::PIPE_COMERCIAL): self
    {
        static::seedPipelineDefaults($pipeline);

        return static::query()
            ->where('pipeline', $pipeline)
            ->orderByDesc('is_default')
            ->orderByDesc('is_initial')
            ->orderBy('position')
            ->firstOrFail();
    }

    public static function findByPipelineAndSlug(string $pipeline, string $slug): ?self
    {
        return static::query()
            ->where('pipeline', $pipeline)
            ->where('slug', $slug)
            ->first();
    }

    public static function generateUniqueSlug(string $name, string $pipeline, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug !== '' ? $baseSlug : 'coluna';
        $suffix = 1;

        while (
            static::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('pipeline', $pipeline)
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
