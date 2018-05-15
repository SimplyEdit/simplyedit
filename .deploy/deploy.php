<?php
/*
 * This file has been generated automatically.
 * Please change the configuration for correct use deploy.
 */

//require 'recipe/common.php';
require __DIR__ . '/vendor/deployphp/recipes/recipes/rsync.php';

// allow specification of group of servers
argument('stage', \Symfony\Component\Console\Input\InputArgument::OPTIONAL, 'Run tasks only on this server or group of servers.');


// Set configurations
set('shared_files', []);
set('shared_dirs', []);
set('writable_dirs', []);
set('clear_use_sudo', false);
set('writable_use_sudo', false);
set('copy_dirs', []);
set('default_stage','canary');

env('rsync_src', dirname(__DIR__));
env('majorversion',getenv('MAJOR'));
env('rsync_dest','{{deploy_path}}/{{majorversion}}/');
env('workspace', function() {
	return runLocally('mktemp -d')->toString();
});

env('version', function() {
	// if it's a tag, use tag
	$version = getenv('CI_BUILD_TAG');
	if (! empty($version)) {
		return $version;
	}

	//use build ref
	$version = getenv('CI_BUILD_REF');
	if (!empty($version)) {
		return $version;
	}

	// local compiles, use git as fallback
	$version = runLocally('git rev-parse HEAD')->toString();
	return $version;
});


set('rsync',[
	'exclude'      => [
		'.git',
		'.deploy',
		'.csslintrc',
		'.gitlab-ci.yml',
		'examples',
	    'tests',
		'attic',
	],
	'flags'         => 'rzcE',
	'options'       => ['delete', 'delete-after', 'delay-updates','ignore-times', 'delete-excluded'],
	'exclude-file' => false,
	'include'      => [ ],
	'include-file' => false,
	'filter'       => [],
	'filter-file'  => false,
	'filter-perdir'=> false,
	'timeout'      => 60,
]);

// Configure servers
server('canary', 'se-cdn-dc.muze.nl')
	->user('deployer')
	->forwardAgent()
	->stage('canary')
	->env('deploy_path', '/opt/canary.simplyedit.io/res/');

// Configure servers
server('cdn1', 'se-cdn-dc.muze.nl')
	->user('deployer')
	->forwardAgent()
	->stage('cdn')
	->env('deploy_path', '/opt/cdn.simplyedit.io/res/');

task('prepare:workdir', function() {
	runLocally('git archive --prefix=release/ HEAD | tar -C {{workspace}} -xf -');
	env('release', '{{workspace}}/release/');
	env('rsync_src', '{{release}}');
})->desc('Preparing code for deployment');

task('prepare:pack', function() {
	//FOR NOW, no repack runLocally('cd {{release}}/hope && ./pack');
	runLocally('cd {{release}}/hope && find {{release}}/hope -type f ! -name hope.packed.js -delete ');
})->desc('Pack hope');

task('prepare:simply-edit', function() {
	runLocally('cd {{release}} && sed -e "s/@version/{{version}}/" js/simply-edit.js  > simply-edit.js && rm js/simply-edit.js');
})->desc('Prepare simply-edit.js');

task('prepare:cleanup', function() {
	runLocally('cd {{release}} && find .  -type d -empty -delete');
})->desc('Cleanup releasedir');

task('prepare', [
	'prepare:workdir',
	'prepare:pack',
	'prepare:simply-edit',
	'prepare:cleanup',
])->desc('Prepare Release');

/*
 * cdn supporting tasks
 */

task('configure-build', function() {
	$version = env('version');
	$major = explode('.',$version)[0];
	if($major != (int)$major ) {
		throw new RuntimeException('version is not a tag');
	}

	env('rsync_dest','{{deploy_path}}/'.$major.'/{{version}}/');
	env('major',$major);

})->desc('Configure desination for cdn');

task('cdn-symlink', function(){
	env('majorpath','{{deploy_path}}/{{major}}/');
	$link = run('if [ -e "{{majorpath}}/latest" ] ; then readlink "{{majorpath}}/latest" ; else echo {{major}}.0 ; fi')->toString();
	$version = env('version');
	if(version_compare($version,$link,'>')){
		run('cd "{{majorpath}}" && ln -sfn {{version}} latest');
	}
})->desc('Set Symlink');


/**
 * Main task
 */
task('deploy', [
	'prepare',
	'rsync',
])->desc('Deploy SimplyEdit');

/**
 * Main cdn deploy
 */
task('release', [
	'configure-build',
	'prepare',
	'rsync',
	'cdn-symlink',
])->desc('Deploy Tag to CDN');
