const endpoint = "https://legendary-study-3-0.vercel.app/"

export interface ReportInterface {
    date_insert: string;
    leg_seen: [string, number][]
    legendary_players: [string, number][]
    zlc_record: {
        registered_on: string;
        amount: number;
    }
    number_total_users: number;
}

export async function getTimestampsReports(): Promise<string[]> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(endpoint + "getTimestampsReport", { signal: controller.signal });
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json() as [string];
        return result
    } catch (e: any) {
        console.error(e);
        let msg = e.toString();
        if (e.name === 'AbortError') {
            msg = 'timeout after 10s';
        }
        return []
    }
}

export async function getReportByDate(date: string): Promise<ReportInterface> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(endpoint + "getReportByDate?date="+ date, { signal: controller.signal });
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json() as ReportInterface;
        return result
    } catch (e: any) {
        console.error(e);
        let msg = e.toString();
        if (e.name === 'AbortError') {
            msg = 'timeout after 10s';
        }
        throw new Error(`Aborted,  ${msg}`);
    }
}