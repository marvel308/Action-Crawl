const fetch = require('node-fetch');
const fs = require('fs');
const jsdom = require('jsdom');

const writeCriticalData = require('./critical.js');

function getEvents(document, event) {
  result = [];
  for (const div of document.getElementsByClassName(event)) {
    if (div.getElementsByClassName('event_icon own_goal').length > 0) {
      const time = div.children[0].textContent.trim().split('\n')[0];
      const goal_scorer = div.children[1].children[1].children[0].textContent.trim();
      const fact = div.children[1].children[1].children[1].textContent.split('\n').map((a) => a.trim()).reduce((a, b) => a + b);
      result.push([time, goal_scorer, fact]);
    }

    if (div.getElementsByClassName('event_icon goal').length > 0) {
      const time = div.children[0].textContent.trim().split('\n')[0];
      const goal_scorer = div.children[1].children[1].children[0].textContent.trim();
      let fact = '';
      if (div.children[1].children[1].children.length > 1) {
        fact = div.children[1].children[1].children[1].textContent.split('\n').map((a) => a.trim()).reduce((a, b) => a + b);
      }
      result.push([time, goal_scorer, fact]);
    }
    if (div.getElementsByClassName('event_icon penalty_goal').length > 0) {
      const time = div.children[0].textContent.trim().split('\n')[0];
      const goal_scorer = div.children[1].children[1].children[0].textContent.trim();
      let fact = '';
      if (div.children[1].children[1].children.length > 1) {
        fact = div.children[1].children[1].children[1].textContent.split('\n').map((a) => a.trim()).reduce((a, b) => a + b);
      }
      result.push([time, goal_scorer, fact]);
    }
  }
  return result;
}

function getMatchFacts(document) {
  const home = getEvents(document, 'event a');
  const away = getEvents(document, 'event b');
  return {home: home, away: away};
}

function GetAllGames(document) {
  const div = document.getElementById('sched_ks_3232_1');
  const hrefss = [];
  for (let i = 0; i< div.rows.length; i++) {
    if (div.rows[i].cells[12].firstElementChild) {
      const result = [
        div.rows[i].cells[2].textContent,
        div.rows[i].cells[4].textContent,
        div.rows[i].cells[8].textContent,
        div.rows[i].cells[12].firstElementChild.href,
      ];
      hrefss.push(result);
    }
  }
  return hrefss;
}

async function fetchFromUrl(url) {
  url = 'https://fbref.com' + url;
  const result = await fetch(url).then(function(response) {
    // The API call was successful!
    return response.text();
  }).then(function(html) {
    // Convert the HTML string into a document object
    const dom = new jsdom.JSDOM(html);

    return dom.window.document;
  }).catch(function(err) {
    // There was an error
    console.info('Something went wrong.', err);
  });
  return result;
}

async function fetchGame(arr) {
  const doc = await fetchFromUrl(arr[3]);
  const game_data = getMatchFacts(doc);
  const result = [];
  for (const game of game_data.home) {
    result.push([arr[0], arr[1], arr[2], game[0], game[1], game[2], arr[1]].join(','));
  }
  for (const game of game_data.away) {
    result.push([arr[0], arr[1], arr[2], game[0], game[1], game[2], arr[2]].join(','));
  }
  return result.join('\n');
}

async function scrapeAllData(url) {
  const result = [];
  const doc = await fetchFromUrl(url);
  for (const game of GetAllGames(doc)) {
 		const data = await fetchGame(game);
 		result.push(data);
 	}
 	return result.filter((x) => x).join('\n');
}

async function writeData() {
  data = await scrapeAllData('/en/comps/9/schedule/Premier-League-Scores-and-Fixtures');
  data = ['Date,Home,Away,Minute Scored,Goal Scorer,Fact,Team', data].join('\n');
  fs.writeFile('data.csv', data, (err) => console.error(err));
  writeCriticalData(data);
}

writeData();
