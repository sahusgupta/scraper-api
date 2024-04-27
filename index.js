const puppeteer = require("puppeteer-core");
async function login(username, password, link) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');

    const loginUrl = `${link}/Homeaccess/Account/LogOn`;
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    // Extract CSRF token
    const requestVerificationToken = await page.evaluate(() => {
        const element = document.querySelector('input[name="__RequestVerificationToken"]');
        return element ? element.value : null;
    });

    if (!requestVerificationToken) {
        console.error("Failed to retrieve CSRF token");
        await browser.close();
        throw new Error("Failed to retrieve CSRF token");
    }

    // Fill the form
    await page.type('input[name="LogOnDetails.UserName"]', username);
    await page.type('input[name="LogOnDetails.Password"]', password);

    await clickButtonAndWaitForNavigation(page, '#login');

    const currentUrl = page.url();
    if (currentUrl.includes("Logon")) {
        console.error("Login failed: Invalid credentials.");
        await browser.close();
        return [null, false, new Error("invalid login credentials")];
    } else {
        console.log("Login successful!");

        //const pageContent = await page.content();
        //console.log(pageContent);
        
        return [page, browser, true]; 
    }
}


async function getAverages(browser, link, sw) {
    const page = await browser.newPage();
    const url = link + "/HomeAccess/Content/Student/Assignments.aspx";

    // Navigate to the page
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let grades = {};

    // Set form data
    await page.select('select[name="ctl00$plnMain$ddlReportCardRuns"]', sw + "-2024");
    await page.select('select[name="ctl00$plnMain$ddlClasses"]', "ALL");
    await page.select('select[name="ctl00$plnMain$ddlCompetencies"]', "ALL");
    await page.select('select[name="ctl00$plnMain$ddlOrderBy"]', "Class");

    await clickButtonAndWaitForNavigation(page, '#plnMain_btnRefreshView')
    
    //console.log(page)

    let assignments = await page.$$eval('.AssignmentClass', elements => elements.map((el, index) => {
        const classNameElement = el.querySelector('a.sg-header-heading');
        let fullClassName = classNameElement ? classNameElement.textContent.trim() : 'Class name not found';
    
        let className = fullClassName.replace(/^\S+\s-\s\d+\s/, '').trim();

    
        const avgElement = el.querySelector(`#plnMain_rptAssigmnetsByCourse_lblHdrAverage_${index}`);
        let avgText = avgElement ? avgElement.textContent.trim() : 'Grade not found';
    
        // getting # grade w regex
        let matches = avgText.match(/(\d+)/);
        let avg = matches ? matches[0] : '';
    
        return { className, avg };
    }));
    
    //console.log(assignments.length);
    for (let assignment of assignments) {
        grades[assignment.className] = assignment.avg;
    }
    await page.close(); // page close

    return {
        "Grades": grades
    };
}

async function getAssignments (browser, link, sw) {
    const page = await browser.newPage();
    const url = link + "/HomeAccess/Content/Student/Assignments.aspx";
    // Navigate to the page
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let grades = {};
    // Set form data
    await page.select('select[name="ctl00$plnMain$ddlReportCardRuns"]', sw + "-2024");
    await page.select('select[name="ctl00$plnMain$ddlClasses"]', "ALL");
    await page.select('select[name="ctl00$plnMain$ddlCompetencies"]', "ALL");
    await page.select('select[name="ctl00$plnMain$ddlOrderBy"]', "Class");

    await clickButtonAndWaitForNavigation(page, '#plnMain_btnRefreshView')
    //console.log(page)
    await page.waitForSelector('html')
    let content = await page.$$eval('.AssignmentClass', elements => elements.map(el => {

        const nameElement = el.querySelector('a.sg-header-heading');//please omfg pls be the issue
        const name = nameElement ? nameElement.textContent.replace("\n", "").trim().replace(/^\S+\s-\s\d+\s/, '').trim() : 'Name not found';
        const tables = el.querySelectorAll('table.sg-asp-table');
    
        let cs = [];
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cols = Array.from(row.querySelectorAll('td'));
                var c = cols.map(col => col.textContent.replace('\n', '').replace("*", "").trim());
                if (c[0] == "Date Due" || c[0] == "Category"){return;}
                if ("Total Points:" == c[0]) {c = c[c.length - 1];}
                cs.push(c);
            });
        });
        return { name, cs };
    }));
    

    for (let classDiv of content) {
        grades[classDiv.name] = classDiv.cs;
    }
    
    //console.log(assignments.length);
    
    await page.close(); // page close

    return {
        "Grades": grades
    };
}

async function getTranscript(browser, link) {
    const page = await browser.newPage();
    await page.goto(link + "/HomeAccess/Content/Student/Transcript.aspx");

    let aggregate = {};
    let sems = {};

    // ok all tables
    const tables = await page.$$eval('td.sg-transcript-group', tables => tables.map(table => {
        let semester = {};

        //tbl1 - year, semester, grade, and campus
        const spans = Array.from(table.querySelectorAll('table > tbody > tr > td > span'));
        spans.forEach(span => {
            //console.log(`span with ID: ${span.id} and Text: ${span.textContent.trim()}`);
            if (span.id.includes("YearValue")) {
                semester["year"] = span.textContent.trim();
            } else if (span.id.includes("GroupValue")) {
                semester["semester"] = span.textContent.trim();
            } else if (span.id.includes("GradeValue")) {
                semester["grade"] = span.textContent.trim();
            } else if (span.id.includes("BuildingValue")) {
                semester["campus"] = span.textContent.trim();
            }
        });

        //tbl2 - Extracting data rows
        const rows = Array.from(table.querySelectorAll('table:nth-child(2) > tbody > tr'));
        semester.data = rows.map((row, index) => {
        if (index === 0) return null;  // Skip the first row (header)
            return Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());}).filter(row => row !== null);

        //tbl3 - Extracting credits
        const labels = Array.from(table.querySelectorAll('table:nth-child(3) > tbody > tr > td > label'));
        labels.forEach(label => {
            if (label.id.includes("CreditValue")) {
                semester.credits = label.textContent.trim();
            }
        });

        return semester;
    }));

    tables.forEach(semester => {
        if (semester.year && semester.semester) {
            const title = `${semester.year} - Semester ${semester.semester}`;
            sems[title] = semester;
        }
    });

    //GPA info
    const gpaInfo = await page.$$eval('table#plnMain_rpTranscriptGroup_tblCumGPAInfo tbody > tr.sg-asp-table-data-row', rows => {
        return rows.map(row => {
            const spans = row.querySelectorAll('td > span');
            const gpaData = {};
            spans.forEach(span => {
                if (span.id.includes("GPADescr")) {
                    gpaData.text = span.textContent.trim();
                } else if (span.id.includes("GPACum")) {
                    gpaData.value = span.textContent.trim();
                } else if (span.id.includes("GPARank")) {
                    gpaData.rank = span.textContent.trim();
                } else if (span.id.includes("GPAQuartile")) {
                    gpaData.quartile = span.textContent.trim();
                }
            });
            return gpaData;
        });
    });

    gpaInfo.forEach(info => {
        if (info.text) {
            sems[info.text] = info.value;
            if (info.rank) {
                sems["rank"] = info.rank;
            }
            if (info.quartile) {
                sems["quartile"] = info.quartile;
            }
        }
    });

    aggregate.Transcript = sems;
    await browser.close();
    return aggregate;
}


async function clickButtonAndWaitForNavigation(page, buttonSelector, navigationOptions = { waitUntil: 'domcontentloaded' }) {
    await page.waitForSelector(buttonSelector, { visible: true });
    await Promise.all([
        page.click(buttonSelector),
        page.waitForNavigation(navigationOptions)
    ]);
}

async function getRegistration (browser, link) {
    const page = await browser.newPage();
    link = link + "/HomeAccess/Content/Student/Registration.aspx";
    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html');
    let info = await page.$eval('div.sg-hac-content', (div) => {
        var labels = div.querySelectorAll('label');
        labels = Array.from(labels).map((label) => label.textContent.trim());
        var spans = div.querySelectorAll('span');
        spans = Array.from(spans).map((span) => {
            if (span.textContent.trim() != null){
                span.textContent.trim()
                return span.textContent.trim();
            } else {
                return "";
            }});
        return [ labels, spans ]

    });
    console.log(info);
    let res = {};
    let length = Math.min(info[0].length, info[1].length);
    for (let i = 0; i < length; i++) {
        res[info[0][i]] = info[1][i];
    }
    return res;

}

module.exports = { login, getAverages, getAssignments, getTranscript, getRegistration };

/* for testing
(async () => {
  const [page, browser, success] = await login('putusername', 'putpassword', 'https://homeaccess.katyisd.org');
  if (success) {
      const averages = await fetchAverages(browser,'https://homeaccess.katyisd.org', 3);
      console.log(averages);
      await browser.close(); 
  }
})();
*/

