import { IsString, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(2)
  query!: string;
}
