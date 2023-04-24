import {getTimestampsReports,getReportByDate, ReportInterface} from './webserviceManager';

export const reportTimestamps = await getTimestampsReports();
export const reportTimestampsSet = new Set();
export const latestReportTimestamp = reportTimestamps[0];

const reportCache = new Map<number, ReportInterface>();

export async function fetchReport(timestamp: number): Promise<string> {
  const cached = reportCache.get(timestamp);
  if (cached !== undefined) {
    return prettifyReport(cached);
  }
  try{
    const report= await getReportByDate(timestamp) as ReportInterface;
    reportCache.set(timestamp, report);
    return prettifyReport(report);
  } catch (e:any) {
    console.error(e);
    let msg = e.toString();
    if (e.name === 'AbortError') {
      msg = 'timeout after 10s';
    }
    throw new Error(`failed to fetch report: ${msg}`);
  }
}

function prettifyLegendaryPlayers(rawLegendaryPlayersList:Array<[string,number]>,totalPlayers:number):string{
  let returnString="";
  let oldNumberPlayers=0;//used to calculate the %
  const sortedLegendaryPlayersList = Object.entries(rawLegendaryPlayersList).map(([key, value]) => ({
    nLeg: Number.parseInt(key),
    nPlayers:value
  })).sort((a, b) => (a.nLeg > b.nLeg ? -1 : 1));
  for (let el in sortedLegendaryPlayersList) {
    let numberLeg:number=+sortedLegendaryPlayersList[el].nLeg;
    let numberPlayers:number=+sortedLegendaryPlayersList[el].nPlayers;
    let percentLeg=Number(((100*(numberPlayers+oldNumberPlayers))/totalPlayers).toFixed(2));
    returnString+=`- ${numberLeg}: ${numberPlayers} players\t (top ${percentLeg}%)\n`;
    oldNumberPlayers+=numberPlayers;
  }
  return returnString;
}

function prettifyLegendarySeen(rawLegendarySeenList:Array<[string,number]>,totalPlayers:number):string{
  let returnString="";
  const sortedLegendarySeenList = Object.entries(rawLegendarySeenList).map(([key, value]) => ({
    artName: key,
    nLeg:value
  })).sort((a, b) => (a.nLeg > b.nLeg ? -1 : 1));
  for (let el in sortedLegendarySeenList) {
    let artName:string=sortedLegendarySeenList[el].artName.replaceAll("_","-").replaceAll("NORMAL","3").replaceAll("GREATER","4").toLowerCase();
    let legSeen:number=+sortedLegendarySeenList[el].nLeg;
    let percentLeg=Number((totalPlayers/legSeen).toFixed(1));
    let customTabs=artName.length>19 ? "\t" : artName.length>15 ?"\t\t":"\t\t\t"
    returnString+=`- ${artName}: ${customTabs}${legSeen} (1 per ${percentLeg} players)\n`;
  }
  return returnString;
}

export function prettifyReport(rawReport:ReportInterface):string{
  const dateReport=new Date(rawReport.date_insert*1000).toLocaleString();
  const totalPlayers=rawReport.report.number_total_users;
  const zlcAmount=rawReport.report.zlc_record.count_exthens;
  const zlcDateReport=rawReport.report.zlc_record.report_date;
  const legendaryPlayers=prettifyLegendaryPlayers(rawReport.report.legendary_players,totalPlayers);
  const legendarrySeen=prettifyLegendarySeen(rawReport.report.leg_seen,totalPlayers);

  let reportText=`Legendaries study rolling report (last 30 days)\n===============================================\nUpdated ${dateReport}\n\nNumber of players currently enrolled in study: ${totalPlayers}\nRecord Extended Henerprise count among Zero Legendary Club players:\n${zlcAmount} (recorded on ${zlcDateReport})\n\n`
  reportText+="Number of legendaries possessed by each player:\n"+legendaryPlayers;
  reportText+="\nLegendaries seen:\n"+legendarrySeen;
  return reportText
}