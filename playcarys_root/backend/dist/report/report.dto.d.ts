export declare class CreateReportDto {
    reported_by: number;
    reported_user: number;
    type: string;
    reason: string;
    session?: string;
    sessionId?: number;
}
export declare class UpdateReportStatusDto {
    requester_user_id: number;
    status: 'pending' | 'under-review' | 'resolved' | 'rejected';
    actionNote?: string;
}
