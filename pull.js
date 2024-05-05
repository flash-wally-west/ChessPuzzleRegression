const fs = require("fs");
const cliProgress = require('cli-progress');
let stream = fs.createWriteStream("data.csv", {flags:'a'});
const meta = JSON.parse(fs.readFileSync("meta.json"));
const completedTeams = JSON.parse(fs.readFileSync("completedTeams.json"));
console.log(completedTeams);
let currentPageNumber = meta.currentPage;
let team1 = true;

(async () => {
    while (currentPageNumber !== 0)
    {
        const teams = await getMinSizeTeams(currentPageNumber);
        if (teams.length === 0)
        {
            console.log(`Skipping page ${currentPageNumber} due to insufficient team size`);
        }
        else
        {
            for (let team of teams)
            {
                if (completedTeams.filter(obj => obj.team === team.id).length !== 0)
                {
                    console.log(`Skipping ${team.id} since it's already completed`);
                    continue;
                }
                const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                
                console.log(`Processing team: ${team.id} | members: ${team.nbMembers}`);
                bar.start(team.nbMembers, 0);
                let membersResponse = fetch(`https://lichess.org/api/team/${team.id}/users`);
                try
                {
                    await membersResponse.then(readStream(onMessage.bind(undefined,team, bar)));
                }
                catch (e) {console.log("error")}
                bar.stop();
                console.log(`Finished ${team.id}`);
                completedTeams.push({
                    team: team.id,
                    nMembers: team.nbMembers
                });
                fs.writeFileSync(`completedTeams.json`, JSON.stringify(completedTeams,undefined,4));
            }
            console.log(`Completed page ${currentPageNumber}`);
        }
        currentPageNumber -= 1;
    }
})();

async function getMinSizeTeams(page)
{
    const teams = (await (await fetch(`https://lichess.org/api/team/all?page=${page}`)).json()).currentPageResults
    const result = [];
    for (let team of teams)
    {
        if (team.nbMembers > meta.minTeamSize)
        {
            result.push(team);
        }
    }
    return result;
}

const readStream = processLine => response => {
    const stream = response.body.getReader();
    const matcher = /\r?\n/;
    const decoder = new TextDecoder();
    let buf = '';
  
    const loop = () =>
      stream.read().then(({ done, value }) => {
        if (done) {
          if (buf.length > 0) processLine(JSON.parse(buf));
        } else {
          const chunk = decoder.decode(value, {
            stream: true
          });
          buf += chunk;
  
          const parts = buf.split(matcher);
          buf = parts.pop();
          for (const i of parts.filter(p => p)) processLine(JSON.parse(i));
          return loop();
        }
      });
  
    return loop();
}

const onMessage = (team, progressBar, obj) => {
    const row = `\n${obj.username},${team.id},${obj?.profile?.flag},${obj?.tosViolation},`
        + `${obj?.perfs?.storm?.runs},${obj?.perfs?.storm?.score},`
        + `${obj?.perfs?.racer?.runs},${obj?.perfs?.racer?.score},`
        + `${obj?.perfs?.streak?.runs},${obj?.perfs?.streak?.score},`
        + `${obj?.perfs?.puzzle?.rd},${obj?.perfs?.puzzle?.games},${obj?.perfs?.puzzle?.rating},`
        + `${obj?.perfs?.bullet?.rd},${obj?.perfs?.bullet?.games},${obj?.perfs?.bullet?.rating},`
        + `${obj?.perfs?.blitz?.rd},${obj?.perfs?.blitz?.games},${obj?.perfs?.blitz?.rating},`
        + `${obj?.perfs?.rapid?.rd},${obj?.perfs?.rapid?.games},${obj?.perfs?.rapid?.rating},`
        + `${obj?.perfs?.classical?.rd},${obj?.perfs?.classical?.games},${obj?.perfs?.classical?.rating},`
        + `${obj?.perfs?.chess960?.rd},${obj?.perfs?.chess960?.games},${obj?.perfs?.chess960?.rating},`
        + `${obj?.profile?.fideRating},${obj?.profile?.uscfRating}`;
    stream.write(row);
    progressBar.increment();
    
};
const onComplete = (progressBar) =>
{
    
    console.log('The stream has completed');
};

