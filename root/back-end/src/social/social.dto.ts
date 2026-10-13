import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({ example: 7, description: 'The user sending the request.' })
  @IsInt()
  from_user: number;

  @ApiProperty({ example: 8, description: 'The user being asked.' })
  @IsInt()
  to_user: number;
}

export class RespondFriendRequestDto {
  @ApiProperty({ example: 8, description: 'The user answering. Must be the recipient of the request.' })
  @IsInt()
  user_id: number;

  @ApiProperty({
    example: 'accept',
    enum: ['accept', 'reject'],
    description:
      'Either answer notifies the requester. Rejecting used to be silent, which left the ' +
      'requester waiting on an answer that had already been given.',
  })
  @IsString()
  action: 'accept' | 'reject';
}

export class SendMessageDto {
  @ApiProperty({ example: 7 })
  @IsInt()
  from_user: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  to_user: number;

  @ApiProperty({ example: 'good game!', maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}

export class MarkDeliveredDto {
  @ApiProperty({
    example: 8,
    description:
      'The RECIPIENT acknowledging receipt. Delivery is only ever claimed by the ' +
      'receiving client, never assumed by the sender.',
  })
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({
    example: 7,
    description: 'Limit the ack to one conversation. Omit to ack everything addressed to me.',
  })
  @IsOptional()
  @IsInt()
  from_user?: number;
}
