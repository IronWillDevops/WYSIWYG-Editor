<?php

declare(strict_types=1);

use App\Http\Controllers\DemoPostController;
use Illuminate\Http\Request;

beforeEach(function () {
    if (! class_exists('App\Http\Controllers\Controller', false)) {
        eval('namespace App\Http\Controllers; class Controller {}');
    }

    require_once dirname(__DIR__, 2).'/demo/app/Http/Controllers/DemoPostController.php';

    $this->app['config']->set('session.driver', 'array');
    $this->app['config']->set('view.paths', [dirname(__DIR__, 2).'/demo/resources/views']);
});

it('shows the same default content in the editor and on the published post page', function () {
    $request = Request::create('/');
    $request->setLaravelSession($this->app['session']->driver());

    $controller = new DemoPostController();
    $editContent = $controller->edit($request)->getData()['content'];
    $showContent = $controller->show($request)->getData()['content'];

    expect($editContent)->toBe($showContent)
        ->and($editContent)->toContain('WYSIWYG Editor');
});

it('keeps saved session content for both pages', function () {
    $request = Request::create('/');
    $request->setLaravelSession($this->app['session']->driver());
    $request->session()->put('demo.content', '<p>saved</p>');

    $controller = new DemoPostController();

    expect($controller->edit($request)->getData()['content'])->toBe('<p>saved</p>')
        ->and($controller->show($request)->getData()['content'])->toBe('<p>saved</p>');
});
