const endpoint="https://egg-brosssh.vercel.app/"

interface webServiceResponse{
    success:boolean;
    message:any;
}

export interface ReportInterface {
      date_insert:number;
      report:{
        leg_seen:[string,number][]
        legendary_players:[string,number][]
        zlc_record:{
          user_name:string;
          report_date:string;
          count_exthens:number;
        }
        number_total_users:number;
      }
  }

export async function getTimestampsReports(): Promise<number[]>{
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(endpoint + "getTimestampsReport", { signal: controller.signal });
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json() as webServiceResponse;
    if(!result.success){
        return []
    }
    return result.message
    } catch (e:any) {
        console.error(e);
        let msg = e.toString();
        if (e.name === 'AbortError') {
            msg = 'timeout after 10s';
        }
        return []
    }
}

export async function getReportByDate(timestamp:number):Promise<ReportInterface>{
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(endpoint + "getReportByDate?date="+timestamp.toString(), { signal: controller.signal });
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
    const result = await response.json() as webServiceResponse;
    if(!result.success){
        throw new Error(`The report returned was not valid`);
    }
    return result.message
    } catch (e:any) {
        console.error(e);
        let msg = e.toString();
        if (e.name === 'AbortError') {
            msg = 'timeout after 10s';
        }
        throw new Error(`Aborted,  ${msg}`);
    }
}