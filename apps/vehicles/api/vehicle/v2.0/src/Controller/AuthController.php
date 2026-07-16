<?php

declare(strict_types=1);

final class AuthController
{
    public function __construct(private AuthService $auth)
    {
    }

    public function loginLocal(Request $request): void
    {
        try {
            $username = trim((string) ($request->body['username'] ?? ''));
            $password = (string) ($request->body['password'] ?? '');

            if ($username === '' || $password === '') {
                Response::error('Uzivatelske jmeno a heslo jsou povinne', 422);
                return;
            }

            $data = $this->auth->loginLocal($username, $password);
            Response::success($data, 200);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public function me(Request $request): void
    {
        $user = $this->auth->currentUser($request);
        if ($user === null) {
            Response::success(['user' => null], 200);
            return;
        }

        Response::success(['user' => $user], 200);
    }

    public function entraLoginUrl(Request $request): void
    {
        $defaultRedirect = Env::get('VEHICLES_V2_ENTRA_REDIRECT_URL', 'https://erdms.zachranka.cz/dev/vehicles-v2');
        $redirectUrl = trim((string) ($request->query['redirect'] ?? ''));

        if ($redirectUrl === '') {
            $redirectUrl = $defaultRedirect;
        }

        Response::success([
            'authUrl' => $this->auth->getEntraLoginUrl($redirectUrl),
        ]);
    }

    public function loginEntra(Request $request): void
    {
        try {
            $data = $this->auth->loginEntra($request);
            Response::success($data, 200);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public function logout(): void
    {
        AuthToken::clearCookie();
        Response::success(['message' => 'Odhlaseni probehlo uspesne'], 200);
    }
}
