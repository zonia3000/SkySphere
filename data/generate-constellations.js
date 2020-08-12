const https = require('https');
const fs = require('fs');

process.chdir('./data');

const clinesUrl = "https://cdn.jsdelivr.net/gh/KDE/kstars/kstars/data/clines.dat";
const hygdataUrl = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hygdata_v3.csv";

class Star {
  constructor(ra, dec) {
    this.ra = this.cut(2 * Math.PI * parseFloat(ra) / 24);
    this.dec = this.cut((parseFloat(dec) + 90) * 2 * Math.PI / 360);
  }
  cut(value) {
    // some precision is discarded in favor of generated js file size
    return parseFloat(value.toFixed(6));
  }
}

function chainError(err) {
  console.log("An error happened");
  console.log(err);
  return Promise.reject(err);
};

Promise.all([
    downloadIfMissing("clines.dat", clinesUrl),
    downloadIfMissing("hygdata_v3.csv", hygdataUrl)
  ])
  .then(() => fillStarsMap(), chainError)
  .then(allStars => fillConstellations(allStars), chainError)
  .then(constellations => {
    let content = "module.exports=" + JSON.stringify(constellations);
    fs.writeFileSync('constellations.js', content);
    console.log("Constellations file successfully generated! :-)");
  }, chainError)
  .catch(err => process.exit(1));

function downloadIfMissing(fileName, fileUrl) {
  return new Promise((resolve, reject) => {
    fs.access(fileName, fs.constants.F_OK, err => {
      if (err) {
        console.log("Downloading " + fileName);
        https.get(fileUrl, response => {
          let writeStream = fs.createWriteStream(fileName);
          writeStream
            .on('finish', resolve)
            .on('error', e => reject(e));
          response.pipe(writeStream)
        }).on('error', e => reject(e));
      } else {
        resolve();
      }
    });
  });
}

function fillStarsMap() {
  return new Promise((resolve, reject) => {
    let allStars = {};
    let lineReader = require('readline').createInterface({
      input: fs.createReadStream("hygdata_v3.csv")
    });
    lineReader.on('line', line => {
      let lineData = line.split(',');
      let starName = lineData[2];
      if (!starName !== '') {
        allStars[starName] = new Star(lineData[7], lineData[8]);
      }
    });
    lineReader.on('close', () => {
      addMissingStars(allStars);
      resolve(allStars);
    });
    lineReader.on('error', err => reject(err));
  });
}

// Missing HD catalogue stars used in constellations (data from wikisky.org)
function addMissingStars(allStars) {
  allStars["108249"] = new Star("12.443472222200002", "-63.09944444399999");
  allStars["24072"] = new Star("3.8099722222", "-37.620555556");
  allStars["18623"] = new Star("2.9711944444666663", "-40.304444444");
  allStars["68243"] = new Star("8.158138888866668", "-47.345833333");
}

function fillConstellations(allStars) {

  let data = fs.readFileSync("clines.dat").toString().split("\n");

  let constellationsStarted = false,
    stars = [],
    constellationsPoints = [],
    prevChar = 'C',
    starIndex = -1,
    constellationOffset = 0,
    prevIndexToAdd = 0,
    constellationStarNames = [];

  for (let i = 0; i < data.length; i++) {
    let line = data[i];
    let firstChar = line.charAt(0);

    if (!constellationsStarted) {
      if (firstChar === 'C') {
        // Start of Western constellations list
        constellationsStarted = true;
      }
    } else {
      if (firstChar === 'C') {
        // Reached Chinese constellations list. Exit from loop.
        break;
      }
      if (firstChar === '#' && prevChar === '#') {
        // Start of a constellation
        constellationStarNames = [];
        constellationOffset = starIndex + 1;
      }

      if (firstChar == 'M' || firstChar == 'D') {
        let starName = line.split(" ")[1];
        let starNameIndex = constellationStarNames.lastIndexOf(starName);
        if (starNameIndex == -1) {
          if (starName in allStars) {
            let star = allStars[starName];
            stars.push([star.ra, star.dec]);
          } else {
            throw ("Star HD " + starName + " not found!");
          }
          constellationStarNames.push(starName);
          starIndex++;
        }

        let indexToAdd = starNameIndex == -1 ? starIndex : starNameIndex + constellationOffset;
        if (firstChar == 'M') {
          constellationsPoints.push(indexToAdd);
        } else {
          if (prevChar == 'D') {
            constellationsPoints.push(prevIndexToAdd);
          }
          constellationsPoints.push(indexToAdd);
        }

        prevIndexToAdd = indexToAdd;
      }

      prevChar = firstChar;
    }
  }

  let lines = [];
  for (let i = 0; i < constellationsPoints.length; i += 2) {
    lines.push([constellationsPoints[i], constellationsPoints[i + 1]]);
  }

  return {
    s: stars,
    l: lines
  }
}
