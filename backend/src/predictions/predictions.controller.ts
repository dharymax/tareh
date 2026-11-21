import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreatePredictionDto } from './dto/create-prediction.dto.js';
import { UpdatePredictionDto } from './dto/update-prediction.dto.js';
import { PredictionsService } from './predictions.service.js';

@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePredictionDto,
  ) {
    return {
      data: await this.predictionsService.create(user.userId, body.matchId, {
        homeGoals: body.homeGoals,
        awayGoals: body.awayGoals,
      }),
    };
  }

  @Patch(':predictionId')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('predictionId', new ParseUUIDPipe({ version: '4' })) predictionId: string,
    @Body() body: UpdatePredictionDto,
  ) {
    return {
      data: await this.predictionsService.update(user.userId, predictionId, {
        homeGoals: body.homeGoals,
        awayGoals: body.awayGoals,
      }),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit = '25',
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) {
      throw new BadRequestException('cursor must be a UUID');
    }
    return this.predictionsService.listMine(user.userId, parsedLimit, cursor);
  }

  @Get('match/:matchId')
  async getMatchSummary(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
  ) {
    return this.predictionsService.getMatchPredictionSummary(matchId);
  }
}
