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
        $defaultRedirect = Env::get('VEHICLES_V2_ENTRA_REDIRECT_URL');
        if ($defaultRedirect === '') {
            $defaultRedirect = $this->resolveDefaultRedirectUrl($request);
        }

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

    public function changePassword(Request $request): void
    {
        try {
            $newPassword = (string) ($request->body['new_password'] ?? '');
            if ($newPassword === '') {
                Response::error('Nové heslo je povinné.', 422);
                return;
            }

            $data = $this->auth->changeLocalPassword($request, $newPassword);
            Response::success($data, 200);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function logout(): void
    {
        AuthToken::clearCookie();
        Response::success(['message' => 'Odhlaseni probehlo uspesne'], 200);
    }

    private function resolveDefaultRedirectUrl(Request $request): string
    {
        $forwardedProto = strtolower(trim((string) ($request->headers['X-Forwarded-Proto'] ?? $request->headers['x-forwarded-proto'] ?? 'https')));
        $scheme = $forwardedProto === 'http' ? 'http' : 'https';
        $host = trim((string) ($_SERVER['HTTP_HOST'] ?? 'erdms.zachranka.cz'));
        $basePath = trim(Env::get('VEHICLES_V2_FRONTEND_BASE_PATH', '/dev/vehicles-v2'));

        return $scheme . '://' . $host . '/' . ltrim($basePath, '/');
    }
}
