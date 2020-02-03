const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

const set = (key, value) => {
    console.log('setting', key, 'to', JSON.stringify(value))
    core.setOutput(key, value)
}

async function main() {
    const token = core.getInput('github-token', { required: true });
    const sha = core.getInput('sha');

    let pr;
    console.log('context.payload', JSON.stringify(context));
    if (context.payload.pull_request) {
        pr = context.payload.pull_request;
    } else {
        const client = new GitHub(token, {});
        const result = await client.repos.listPullRequestsAssociatedWithCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: sha || context.sha,
        });
        console.log('response', JSON.stringify(result));
        pr = result.data.find(it => it.state === 'open')
    }

    set('pr', pr && pr.number || '');
    set('number', pr && pr.number || '');
    set('title', pr && pr.title || '');
    set('body', pr && pr.body || '');
    if (pr && pr.labels) {
        set('labels', pr.labels.map(label => label.name));
        pr.labels.forEach((label) => set(
            `label_${label.name}`, true
        ));
    }
}

main().catch(err => core.setFailed(err.message));
