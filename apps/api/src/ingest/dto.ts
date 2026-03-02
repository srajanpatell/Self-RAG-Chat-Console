import { IsString, MinLength } from 'class-validator';

export class IngestTextDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}
