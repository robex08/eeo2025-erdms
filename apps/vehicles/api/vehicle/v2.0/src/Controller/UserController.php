<?php

declare(strict_types=1);

final class UserController
{
    public function __construct(private UserService $users)
    {
    }

    public function list(): void
    {
        $items = $this->users->listUsers();

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function vehiclesCatalog(): void
    {
        $catalog = $this->users->getVehiclesCatalog();

        Response::success($catalog);
    }

    public function assignments(Request $request): void
    {
        $userId = (int) ($request->query['userId'] ?? 0);
        if ($userId <= 0) {
            Response::error('Parametr userId je povinný.', 422);
            return;
        }

        try {
            $item = $this->users->getVehicleAssignments($userId);
            Response::success(['item' => $item]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function create(Request $request): void
    {
        try {
            $item = $this->users->createUser($request->body);
            Response::success([
                'message' => 'Uživatel byl vytvořen.',
                'item' => $item,
            ], 201);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function update(Request $request, int $actorUserId): void
    {
        $userId = (int) ($request->body['id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Parametr id je povinný.', 422);
            return;
        }

        try {
            $item = $this->users->updateUser($userId, $request->body, $actorUserId);
            Response::success([
                'message' => 'Uživatel byl uložen.',
                'item' => $item,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function delete(Request $request, int $actorUserId): void
    {
        $userId = (int) ($request->body['id'] ?? 0);
        if ($userId <= 0) {
            Response::error('Parametr id je povinný.', 422);
            return;
        }

        try {
            $this->users->deleteUser($userId, $actorUserId);
            Response::success([
                'message' => 'Uživatel byl smazán.',
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }
}