# WYSIWYG Editor — Demo

A minimal Laravel application that wires the local `wysiwyg/laravel-editor`
package via a Composer path repository, so you can try changes to the
package in a real browser without publishing anything.

## Setup

This demo expects a full Laravel 13 skeleton (`composer create-project
laravel/laravel .` conventions: `app/`, `bootstrap/`, `config/`, `public/`,
`resources/`, `routes/`, `.env`). Only the files specific to this demo
(controller, route, view) are included here; drop them into a fresh
`laravel/laravel` project, or run:

```bash
composer create-project laravel/laravel:^13.0 wysiwyg-demo-tmp
# then copy app/Http/Controllers/DemoPostController.php,
# routes/web.php, and resources/views/demo/edit.blade.php from here into it,
# and merge this composer.json's "require" + "repositories" into its composer.json
```

Then, from inside the full Laravel project:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan vendor:publish --tag=wysiwyg-editor-assets
php artisan storage:link
php artisan serve
```

Visit `http://127.0.0.1:8000` — you'll see the editor pre-filled with sample
content. Saving posts the sanitized HTML back to the server and stores it in
the session for this demo (swap in a real `Post` model for production use).
